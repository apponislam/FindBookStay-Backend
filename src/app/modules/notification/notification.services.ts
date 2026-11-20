import mongoose from "mongoose";
import httpStatus from "http-status";
import ApiError from "../../../errors/ApiError";
import { NotificationType } from "./notification.interface";
import { NotificationModel } from "./notification.model";
import { UserModel } from "../auth/auth.model";
import { SettingsModel } from "../settings/settings.model";
import { emitToUser, emitToRoom, broadcastEvent } from "../../../utils/socket";
import { sendMulticastPush } from "../../../utils/fcm";
import { notificationRedis } from "./notification.redis";

/**
 * Check whether push notification for this category is enabled in recipient's settings
 */
const isPushAllowedForUser = async (userId: mongoose.Types.ObjectId, type: NotificationType): Promise<boolean> => {
    try {
        const settings = await SettingsModel.findOne({ user: userId }).lean();
        if (!settings?.notifications?.pushNotifications) {
            return true; // Default allowed if user hasn't modified settings
        }

        const pushPrefs = settings.notifications.pushNotifications;

        switch (type) {
            case "BOOKING_CREATED":
            case "BOOKING_CONFIRMED":
            case "BOOKING_CANCELLED":
                return pushPrefs.bookings ?? true;
            case "MESSAGE_RECEIVED":
                return pushPrefs.messages ?? true;
            case "PROMOTION":
                return pushPrefs.promotions ?? false;
            default:
                return pushPrefs.reminders ?? true;
        }
    } catch {
        return true;
    }
};

/**
 * Trigger background FCM push notification safely (non-blocking, checks settings & prunes dead tokens)
 */
const triggerPushNotificationSafely = async (
    recipientId: mongoose.Types.ObjectId,
    type: NotificationType,
    title: string,
    message: string,
    image?: string | null,
    link?: string | null,
    data?: Record<string, any>,
) => {
    try {
        // 1. Anti-storm debounce check: prevent spamming lock screen if multiple notifications arrive in seconds
        const debounceRef = data?.referenceId || data?.conversationId || data?.listingId || "default";
        const isDebounced = await notificationRedis.shouldDebouncePush(recipientId.toString(), type, String(debounceRef));
        if (isDebounced) {
            return;
        }

        // 2. Check user preferences in settings
        const isAllowed = await isPushAllowedForUser(recipientId, type);
        if (!isAllowed) {
            return;
        }

        // 3. Fetch recipient's registered FCM device tokens
        const user = await UserModel.findById(recipientId).select("fcmTokens").lean();
        const tokens = user?.fcmTokens || [];
        if (!tokens || tokens.length === 0) {
            return;
        }

        // 4. Dispatch FCM push notification
        const pushResult = await sendMulticastPush({
            tokens,
            title,
            body: message,
            image,
            link,
            data: {
                notificationType: type,
                ...(data || {}),
            },
        });

        // 5. Automatically prune dead or invalid tokens reported by Firebase
        if (pushResult.failedTokens && pushResult.failedTokens.length > 0) {
            await UserModel.updateOne(
                { _id: recipientId },
                { $pull: { fcmTokens: { $in: pushResult.failedTokens } } },
            );
        }
    } catch (err) {
        console.error(`❌ [FCM Push Error for user ${recipientId}]:`, err);
    }
};

/**
 * Core notification creation engine:
 * Creates DB record, updates atomic Redis unread counter, emits via Socket.IO,
 * and schedules background FCM push notification
 */
const createNotification = async (payload: {
    recipient: string | mongoose.Types.ObjectId;
    sender?: string | mongoose.Types.ObjectId | null;
    type?: NotificationType;
    title: string;
    message: string;
    image?: string | null;
    link?: string | null;
    data?: Record<string, any>;
}) => {
    const recipientObjectId = new mongoose.Types.ObjectId(payload.recipient);
    const senderObjectId = payload.sender ? new mongoose.Types.ObjectId(payload.sender) : null;
    const notificationType: NotificationType = payload.type || "GENERAL";

    const notification = await NotificationModel.create({
        recipient: recipientObjectId,
        sender: senderObjectId,
        type: notificationType,
        title: payload.title.trim(),
        message: payload.message.trim(),
        image: payload.image || null,
        link: payload.link || null,
        data: payload.data || {},
        isRead: false,
    });

    // 1. Atomically increment recipient's unread counter in Redis
    const newUnreadCount = await notificationRedis.incrementUnreadCount(recipientObjectId.toString(), 1);

    const populated = await NotificationModel.findById(notification._id)
        .populate("sender", "name email role profileImage")
        .lean();

    // 2. Real-time instant delivery via Socket.IO (for active web & mobile foreground sessions)
    const recipientIdStr = recipientObjectId.toString();
    emitToUser(recipientIdStr, "new_notification", populated);
    emitToUser(recipientIdStr, "unread_count_update", { unreadCount: newUnreadCount });

    // 3. Background FCM Push Notification (delivers to mobile device lock screens)
    triggerPushNotificationSafely(
        recipientObjectId,
        notificationType,
        payload.title,
        payload.message,
        payload.image,
        payload.link,
        payload.data,
    );

    return populated;
};

const getMyNotifications = async (userId: string, query: Record<string, any>) => {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const { page = 1, limit = 20, isRead, type } = query;

    const pageNumber = Math.max(1, Number(page));
    const limitNumber = Math.max(1, Math.min(100, Number(limit)));
    const skip = (pageNumber - 1) * limitNumber;

    const filter: any = {
        recipient: userObjectId,
        isDeleted: false,
    };

    if (isRead !== undefined) {
        filter.isRead = isRead === "true" || isRead === true;
    }

    if (type && typeof type === "string") {
        filter.type = type.toUpperCase();
    }

    const [notifications, total] = await Promise.all([
        NotificationModel.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNumber)
            .populate("sender", "name email role profileImage")
            .lean(),
        NotificationModel.countDocuments(filter),
    ]);

    // Fast unread count from Redis
    let unreadCount = await notificationRedis.getCachedUnreadCount(userId);
    if (unreadCount === null) {
        unreadCount = await NotificationModel.countDocuments({
            recipient: userObjectId,
            isRead: false,
            isDeleted: false,
        });
        await notificationRedis.setCachedUnreadCount(userId, unreadCount);
    }

    const totalPages = Math.ceil(total / limitNumber);

    return {
        data: notifications,
        meta: {
            page: pageNumber,
            limit: limitNumber,
            total,
            totalPages,
            unreadCount,
            hasNext: pageNumber < totalPages,
            hasPrev: pageNumber > 1,
        },
    };
};

/**
 * High-speed unread badge counter:
 * Checks Redis cache first (<1ms), falls back to MongoDB count only on cache miss
 */
const getUnreadCount = async (userId: string) => {
    // 1. Try Redis cache
    const cachedCount = await notificationRedis.getCachedUnreadCount(userId);
    if (cachedCount !== null) {
        return { unreadCount: cachedCount };
    }

    // 2. Query MongoDB
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const unreadCount = await NotificationModel.countDocuments({
        recipient: userObjectId,
        isRead: false,
        isDeleted: false,
    });

    // 3. Populate Redis cache
    await notificationRedis.setCachedUnreadCount(userId, unreadCount);

    return { unreadCount };
};

const markAsRead = async (notificationId: string, userId: string) => {
    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Invalid notification ID format.");
    }

    const notification = await NotificationModel.findOne({
        _id: new mongoose.Types.ObjectId(notificationId),
        recipient: new mongoose.Types.ObjectId(userId),
        isDeleted: false,
    });

    if (!notification) {
        throw new ApiError(httpStatus.NOT_FOUND, "Notification was not found.");
    }

    if (!notification.isRead) {
        notification.isRead = true;
        notification.readAt = new Date();
        await notification.save();

        // Atomically decrement Redis unread counter
        const newUnreadCount = await notificationRedis.decrementUnreadCount(userId, 1);

        emitToUser(userId, "notification_read", { notificationId, readAt: notification.readAt });
        emitToUser(userId, "unread_count_update", { unreadCount: newUnreadCount });
    }

    return notification;
};

const markAllAsRead = async (userId: string) => {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const readAt = new Date();

    const result = await NotificationModel.updateMany(
        {
            recipient: userObjectId,
            isRead: false,
            isDeleted: false,
        },
        {
            $set: {
                isRead: true,
                readAt,
            },
        },
    );

    // Atomically reset Redis unread counter to 0
    await notificationRedis.resetUnreadCount(userId);

    emitToUser(userId, "all_notifications_read", { readAt });
    emitToUser(userId, "unread_count_update", { unreadCount: 0 });

    return {
        message: "All notifications marked as read successfully.",
        modifiedCount: result.modifiedCount,
        readAt,
    };
};

const deleteNotification = async (notificationId: string, userId: string) => {
    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Invalid notification ID format.");
    }

    const notification = await NotificationModel.findOneAndUpdate(
        {
            _id: new mongoose.Types.ObjectId(notificationId),
            recipient: new mongoose.Types.ObjectId(userId),
        },
        {
            $set: { isDeleted: true },
        },
        { new: false },
    );

    if (!notification) {
        throw new ApiError(httpStatus.NOT_FOUND, "Notification was not found.");
    }

    // If the deleted notification was unread, decrement the counter
    if (!notification.isRead) {
        const newUnreadCount = await notificationRedis.decrementUnreadCount(userId, 1);
        emitToUser(userId, "unread_count_update", { unreadCount: newUnreadCount });
    }

    return { message: "Notification deleted successfully." };
};

const clearAllNotifications = async (userId: string) => {
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const result = await NotificationModel.updateMany(
        { recipient: userObjectId, isDeleted: false },
        { $set: { isDeleted: true } },
    );

    await notificationRedis.resetUnreadCount(userId);
    emitToUser(userId, "unread_count_update", { unreadCount: 0 });

    return {
        message: "All notifications cleared successfully.",
        clearedCount: result.modifiedCount,
    };
};

/**
 * Register or rotate FCM device token for mobile push notifications
 */
const registerFcmToken = async (userId: string, token: string) => {
    if (!token || typeof token !== "string" || token.trim().length < 20) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Invalid FCM device token format.");
    }

    const cleanToken = token.trim();
    const user = await UserModel.findById(userId);
    if (!user) {
        throw new ApiError(httpStatus.NOT_FOUND, "User account not found.");
    }

    const existingTokens = user.fcmTokens || [];
    // Keep max 5 most recent unique device tokens per user
    const updatedTokens = [...existingTokens.filter((t) => t !== cleanToken), cleanToken].slice(-5);

    await UserModel.updateOne(
        { _id: user._id },
        { $set: { fcmTokens: updatedTokens } },
    );

    return {
        message: "FCM device token registered successfully.",
        deviceCount: updatedTokens.length,
    };
};

/**
 * Unregister FCM device token on sign-out / device detach
 */
const unregisterFcmToken = async (userId: string, token: string) => {
    if (!token || typeof token !== "string") {
        throw new ApiError(httpStatus.BAD_REQUEST, "Device token is required.");
    }

    await UserModel.updateOne(
        { _id: new mongoose.Types.ObjectId(userId) },
        { $pull: { fcmTokens: token.trim() } },
    );

    return {
        message: "FCM device token unregistered successfully.",
    };
};

/**
 * Memory-Safe Chunked Admin Broadcast:
 * Inserts in batches of 500 to avoid Node.js OOM crashes on large user bases,
 * and uses single-frame Socket.IO room broadcasts instead of synchronous loops
 */
const sendCustomNotification = async (
    senderId: string,
    payload: {
        recipientId?: string;
        broadcast?: boolean;
        targetRole?: "ALL" | "USER" | "ADMIN";
        type?: NotificationType;
        title: string;
        message: string;
        image?: string;
        link?: string;
        data?: Record<string, any>;
    },
) => {
    const senderObjectId = new mongoose.Types.ObjectId(senderId);

    if (payload.broadcast) {
        const userFilter: any = { isDeleted: false };
        if (payload.targetRole && payload.targetRole !== "ALL") {
            userFilter.role = payload.targetRole;
        }

        const totalRecipients = await UserModel.countDocuments(userFilter);
        if (totalRecipients === 0) {
            return { message: "No active recipients matched the broadcast criteria.", count: 0 };
        }

        const BATCH_SIZE = 500;
        let processedCount = 0;
        const allEligibleTokens: string[] = [];

        // 1. Memory-Safe Chunked Cursor Stream
        const cursor = UserModel.find(userFilter).select("_id fcmTokens").cursor();
        let currentBatch: any[] = [];

        for await (const userDoc of cursor) {
            currentBatch.push(userDoc);

            if (userDoc.fcmTokens && userDoc.fcmTokens.length > 0) {
                allEligibleTokens.push(...userDoc.fcmTokens);
            }

            if (currentBatch.length >= BATCH_SIZE) {
                const docsToInsert = currentBatch.map((u) => ({
                    recipient: u._id,
                    sender: senderObjectId,
                    type: payload.type || "GENERAL",
                    title: payload.title.trim(),
                    message: payload.message.trim(),
                    image: payload.image || null,
                    link: payload.link || null,
                    data: payload.data || {},
                    isRead: false,
                }));

                await NotificationModel.insertMany(docsToInsert, { ordered: false });

                // Increment Redis unread counters for this batch
                for (const u of currentBatch) {
                    notificationRedis.incrementUnreadCount(u._id.toString(), 1);
                }

                processedCount += currentBatch.length;
                currentBatch = [];
            }
        }

        // Flush remaining records
        if (currentBatch.length > 0) {
            const docsToInsert = currentBatch.map((u) => ({
                recipient: u._id,
                sender: senderObjectId,
                type: payload.type || "GENERAL",
                title: payload.title.trim(),
                message: payload.message.trim(),
                image: payload.image || null,
                link: payload.link || null,
                data: payload.data || {},
                isRead: false,
            }));

            await NotificationModel.insertMany(docsToInsert, { ordered: false });

            for (const u of currentBatch) {
                notificationRedis.incrementUnreadCount(u._id.toString(), 1);
            }

            processedCount += currentBatch.length;
        }

        // 2. High-performance Socket Room Broadcast (single network frame instead of 50,000 emits)
        const socketPacket = {
            type: payload.type || "GENERAL",
            title: payload.title,
            message: payload.message,
            image: payload.image,
            link: payload.link,
            createdAt: new Date(),
        };

        if (payload.targetRole && payload.targetRole !== "ALL") {
            emitToRoom(`role_${payload.targetRole}`, "new_notification", socketPacket);
        } else {
            emitToRoom("authenticated_users", "new_notification", socketPacket);
            broadcastEvent("new_notification", socketPacket);
        }

        // 3. Asynchronous Chunked FCM Multicast Push Dispatch
        if (allEligibleTokens.length > 0) {
            (async () => {
                try {
                    const pushResult = await sendMulticastPush({
                        tokens: allEligibleTokens,
                        title: payload.title,
                        body: payload.message,
                        image: payload.image,
                        link: payload.link,
                        data: {
                            notificationType: payload.type || "GENERAL",
                            ...(payload.data || {}),
                        },
                    });

                    if (pushResult.failedTokens.length > 0) {
                        await UserModel.updateMany(
                            { fcmTokens: { $in: pushResult.failedTokens } },
                            { $pull: { fcmTokens: { $in: pushResult.failedTokens } } },
                        );
                    }
                } catch (pushErr) {
                    console.error("❌ [Broadcast FCM Push Error]:", pushErr);
                }
            })();
        }

        return {
            message: `Broadcast notification delivered successfully to ${processedCount} users.`,
            recipientCount: processedCount,
        };
    } else {
        if (!payload.recipientId) {
            throw new ApiError(httpStatus.BAD_REQUEST, "recipientId is required when broadcast is false.");
        }

        const notification = await createNotification({
            recipient: payload.recipientId,
            sender: senderObjectId,
            type: payload.type,
            title: payload.title,
            message: payload.message,
            image: payload.image,
            link: payload.link,
            data: payload.data,
        });

        return notification;
    }
};

export const notificationServices = {
    createNotification,
    getMyNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    registerFcmToken,
    unregisterFcmToken,
    sendCustomNotification,
};
