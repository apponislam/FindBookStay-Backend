import mongoose from "mongoose";
import httpStatus from "http-status";
import ApiError from "../../../errors/ApiError";
import { NotificationType } from "./notification.interface";
import { NotificationModel } from "./notification.model";
import { UserModel } from "../auth/auth.model";
import { emitToUser } from "../../../utils/socket";

/**
 * Reusable utility to create an in-app notification and emit it in real time via Socket.IO
 */
const createNotification = async (payload: {
    recipient: string | mongoose.Types.ObjectId;
    sender?: string | mongoose.Types.ObjectId | null;
    type?: NotificationType;
    title: string;
    message: string;
    image?: string;
    link?: string;
    data?: Record<string, any>;
}) => {
    const recipientObjectId = new mongoose.Types.ObjectId(payload.recipient);
    const senderObjectId = payload.sender ? new mongoose.Types.ObjectId(payload.sender) : null;

    const notification = await NotificationModel.create({
        recipient: recipientObjectId,
        sender: senderObjectId,
        type: payload.type || "GENERAL",
        title: payload.title.trim(),
        message: payload.message.trim(),
        image: payload.image || null,
        link: payload.link || null,
        data: payload.data || {},
        isRead: false,
    });

    const populated = await NotificationModel.findById(notification._id)
        .populate("sender", "name email role profileImage")
        .lean();

    // Real-time instant delivery to recipient's private user room
    emitToUser(recipientObjectId.toString(), "new_notification", populated);

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

    const [notifications, total, unreadCount] = await Promise.all([
        NotificationModel.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNumber)
            .populate("sender", "name email role profileImage")
            .lean(),
        NotificationModel.countDocuments(filter),
        NotificationModel.countDocuments({ recipient: userObjectId, isRead: false, isDeleted: false }),
    ]);

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

const getUnreadCount = async (userId: string) => {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const unreadCount = await NotificationModel.countDocuments({
        recipient: userObjectId,
        isRead: false,
        isDeleted: false,
    });

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

        emitToUser(userId, "notification_read", { notificationId, readAt: notification.readAt });
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

    emitToUser(userId, "all_notifications_read", { readAt });

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
        { new: true },
    );

    if (!notification) {
        throw new ApiError(httpStatus.NOT_FOUND, "Notification was not found.");
    }

    return { message: "Notification deleted successfully." };
};

const clearAllNotifications = async (userId: string) => {
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const result = await NotificationModel.updateMany(
        { recipient: userObjectId, isDeleted: false },
        { $set: { isDeleted: true } },
    );

    return {
        message: "All notifications cleared successfully.",
        clearedCount: result.modifiedCount,
    };
};

/**
 * Admin action: Send a custom notification to an individual user or broadcast to all/role-targeted users
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

        const users = await UserModel.find(userFilter).select("_id");
        if (users.length === 0) {
            return { message: "No active recipients matched the broadcast criteria.", count: 0 };
        }

        const docsToInsert = users.map((u) => ({
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

        await NotificationModel.insertMany(docsToInsert);

        // Broadcast notification packet to individual user rooms
        for (const u of users) {
            emitToUser(u._id.toString(), "new_notification", {
                type: payload.type || "GENERAL",
                title: payload.title,
                message: payload.message,
                image: payload.image,
                link: payload.link,
                createdAt: new Date(),
            });
        }

        return {
            message: `Broadcast notification delivered successfully to ${users.length} users.`,
            recipientCount: users.length,
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
    sendCustomNotification,
};

