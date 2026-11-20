import mongoose from "mongoose";
import httpStatus from "http-status";
import ApiError from "../../../errors/ApiError";
import { MessageModel } from "./message.model";
import { ConversationModel } from "../conversation/conversation.model";
import { conversationServices } from "../conversation/conversation.services";
import { emitToUser } from "../../../utils/socket";
import { emitToConversation } from "./message.socket";
import { notificationServices } from "../notification/notification.services";

const sendMessage = async (
    senderId: string,
    payload: {
        conversationId?: string;
        recipientId?: string;
        listingId?: string;
        clientMessageId?: string;
        messageType?: "TEXT" | "IMAGE";
        text?: string;
        attachments?: string[];
    },
) => {
    let conversation: any = null;
    let resolvedRecipientId: string | null = null;

    if (payload.conversationId) {
        conversation = await ConversationModel.findById(payload.conversationId);
        if (!conversation) {
            throw new ApiError(httpStatus.NOT_FOUND, "Conversation was not found.");
        }

        const isParticipant = conversation.participants.some((p: any) => p.toString() === senderId || p._id?.toString() === senderId);
        if (!isParticipant) {
            throw new ApiError(httpStatus.FORBIDDEN, "You are not a participant in this conversation.");
        }

        const otherParticipant = conversation.participants.find((p: any) => (p._id ? p._id.toString() : p.toString()) !== senderId);
        if (!otherParticipant) {
            throw new ApiError(httpStatus.BAD_REQUEST, "Could not determine message recipient.");
        }
        resolvedRecipientId = otherParticipant._id ? otherParticipant._id.toString() : otherParticipant.toString();
    } else if (payload.recipientId) {
        resolvedRecipientId = payload.recipientId;
        conversation = await conversationServices.createOrGetConversation(senderId, payload.recipientId, payload.listingId);
    } else {
        throw new ApiError(httpStatus.BAD_REQUEST, "Either conversationId or recipientId must be provided.");
    }

    if (conversation.isBlocked) {
        throw new ApiError(httpStatus.FORBIDDEN, "This conversation is currently blocked and messages cannot be sent.");
    }

    const senderObjectId = new mongoose.Types.ObjectId(senderId);
    const recipientObjectId = new mongoose.Types.ObjectId(resolvedRecipientId!);

    // Idempotency: Return existing message if clientMessageId was already processed
    if (payload.clientMessageId?.trim()) {
        const existingMessage = await MessageModel.findOne({
            conversation: conversation._id,
            sender: senderObjectId,
            clientMessageId: payload.clientMessageId.trim(),
        })
            .populate("sender", "name email role profileImage isEmailVerified")
            .populate("recipient", "name email role profileImage isEmailVerified");

        if (existingMessage) {
            return existingMessage;
        }
    }

    let previewText = payload.text?.trim() || "";
    if (!previewText) {
        if (payload.messageType === "IMAGE") previewText = "📷 Photo";
        else previewText = "New message";
    }

    const message = await MessageModel.create({
        conversation: conversation._id,
        sender: senderObjectId,
        recipient: recipientObjectId,
        clientMessageId: payload.clientMessageId?.trim() || undefined,
        messageType: payload.messageType || "TEXT",
        text: payload.text?.trim() || "",
        attachments: payload.attachments || [],
        status: "SENT",
        isRead: false,
    });

    // Atomic conversation update: increments recipient unread count and resets sender unread count
    const currentUnread = (conversation.unreadCounts && conversation.unreadCounts[resolvedRecipientId!]) || 0;

    await ConversationModel.updateOne(
        { _id: conversation._id },
        {
            $set: {
                lastMessage: message._id,
                lastMessageText: previewText,
                lastMessageAt: new Date(),
                [`unreadCounts.${resolvedRecipientId}`]: currentUnread + 1,
                [`unreadCounts.${senderId}`]: 0,
            },
            // If the recipient had archived the conversation, bring it back to active inbox
            $pull: {
                archivedBy: recipientObjectId,
            },
        },
    );

    const populatedMessage = await MessageModel.findById(message._id)
        .populate("sender", "name email role profileImage isEmailVerified")
        .populate("recipient", "name email role profileImage isEmailVerified");

    // Real-time Socket.IO emission to conversation room and recipient's private room
    const convIdStr = conversation._id.toString();
    emitToConversation(convIdStr, "new_message", populatedMessage);
    emitToUser(resolvedRecipientId!, "new_message_notification", {
        conversationId: convIdStr,
        message: populatedMessage,
    });

    // Background push notification (anti-storm debounced in Redis, delivers to mobile lock screen)
    const senderName = (populatedMessage as any)?.sender?.name || "FindBookStay User";
    notificationServices
        .createNotification({
            recipient: resolvedRecipientId!,
            sender: senderId,
            type: "MESSAGE_RECEIVED",
            title: senderName,
            message: previewText,
            link: `/chat/${convIdStr}`,
            data: {
                conversationId: convIdStr,
                messageId: message._id.toString(),
                referenceId: convIdStr,
            },
        })
        .catch((err) => console.error("[Message Push Notification Error]:", err));

    return populatedMessage;
};

const getConversationMessages = async (conversationId: string, userId: string, query: Record<string, any>) => {
    const conversation = await ConversationModel.findById(conversationId);
    if (!conversation) {
        throw new ApiError(httpStatus.NOT_FOUND, "Conversation not found.");
    }

    const isParticipant = conversation.participants.some((p: any) => p.toString() === userId || p._id?.toString() === userId);
    if (!isParticipant) {
        throw new ApiError(httpStatus.FORBIDDEN, "You do not have permission to view messages in this conversation.");
    }

    const { page, limit = 50, sortOrder = "desc", cursor } = query;
    const limitNumber = Math.max(1, Math.min(100, Number(limit || 50)));
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const filter: any = {
        conversation: new mongoose.Types.ObjectId(conversationId),
        deletedFor: { $ne: userObjectId },
    };

    // Fast Keyset (Cursor-based) pagination - O(1) query seek without full document counting
    if (cursor) {
        if (!mongoose.Types.ObjectId.isValid(cursor)) {
            throw new ApiError(httpStatus.BAD_REQUEST, "Invalid cursor format.");
        }
        filter._id = { $lt: new mongoose.Types.ObjectId(cursor) };

        // Fetch limit + 1 items to determine if a subsequent page exists
        const rawMessages = await MessageModel.find(filter)
            .sort({ _id: -1 })
            .limit(limitNumber + 1)
            .populate("sender", "name email role profileImage")
            .populate("recipient", "name email role profileImage")
            .lean();

        const hasMore = rawMessages.length > limitNumber;
        const messages = hasMore ? rawMessages.slice(0, limitNumber) : rawMessages;
        const nextCursor = hasMore && messages.length > 0 ? messages[messages.length - 1]._id.toString() : null;

        return {
            data: sortOrder === "asc" ? messages.reverse() : messages,
            meta: {
                limit: limitNumber,
                nextCursor,
                hasMore,
                isCursorMode: true,
            },
        };
    }

    // Offset-based pagination fallback (for older clients or standard page/limit requests)
    const pageNumber = Math.max(1, Number(page || 1));
    const skip = (pageNumber - 1) * limitNumber;

    const [messages, total] = await Promise.all([
        MessageModel.find(filter)
            .sort({ _id: -1 })
            .skip(skip)
            .limit(limitNumber)
            .populate("sender", "name email role profileImage")
            .populate("recipient", "name email role profileImage")
            .lean(),
        MessageModel.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limitNumber);
    const nextCursor = messages.length > 0 ? messages[messages.length - 1]._id.toString() : null;

    return {
        data: sortOrder === "asc" ? messages.reverse() : messages,
        meta: {
            page: pageNumber,
            limit: limitNumber,
            total,
            totalPages,
            hasNext: pageNumber < totalPages,
            hasPrev: pageNumber > 1,
            nextCursor,
            isCursorMode: false,
        },
    };
};

/**
 * Reconnection Sync ("Catch-Up") endpoint:
 * Fetches all messages created or updated in a conversation since a given timestamp
 */
const syncMessages = async (conversationId: string, userId: string, since?: string) => {
    const conversation = await ConversationModel.findById(conversationId);
    if (!conversation) {
        throw new ApiError(httpStatus.NOT_FOUND, "Conversation not found.");
    }

    const isParticipant = conversation.participants.some((p: any) => p.toString() === userId || p._id?.toString() === userId);
    if (!isParticipant) {
        throw new ApiError(httpStatus.FORBIDDEN, "You do not have permission to view messages in this conversation.");
    }

    const sinceDate = since ? new Date(since) : new Date(Date.now() - 24 * 60 * 60 * 1000);
    if (isNaN(sinceDate.getTime())) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Invalid since timestamp format. Expected ISO date string.");
    }

    const filter: any = {
        conversation: new mongoose.Types.ObjectId(conversationId),
        deletedFor: { $ne: new mongoose.Types.ObjectId(userId) },
        updatedAt: { $gt: sinceDate },
    };

    const messages = await MessageModel.find(filter)
        .sort({ createdAt: 1 })
        .limit(100)
        .populate("sender", "name email role profileImage")
        .populate("recipient", "name email role profileImage")
        .lean();

    return {
        data: messages,
        meta: {
            count: messages.length,
            syncedAt: new Date(),
        },
    };
};

const markMessagesAsRead = async (conversationId: string, userId: string) => {
    const conversation = await ConversationModel.findById(conversationId);
    if (!conversation) {
        throw new ApiError(httpStatus.NOT_FOUND, "Conversation not found.");
    }

    const isParticipant = conversation.participants.some((p: any) => p.toString() === userId || p._id?.toString() === userId);
    if (!isParticipant) {
        throw new ApiError(httpStatus.FORBIDDEN, "You are not a participant in this conversation.");
    }

    const readAt = new Date();

    // Mark all unread messages received by this user in this conversation as READ
    await MessageModel.updateMany(
        {
            conversation: new mongoose.Types.ObjectId(conversationId),
            recipient: new mongoose.Types.ObjectId(userId),
            isRead: false,
        },
        {
            $set: {
                isRead: true,
                readAt,
                status: "READ",
            },
        },
    );

    // Atomically reset this user's unread counter in the conversation document
    await ConversationModel.updateOne(
        { _id: conversationId },
        {
            $set: {
                [`unreadCounts.${userId}`]: 0,
            },
        },
    );

    // Real-time Socket.IO emission to conversation room
    emitToConversation(conversationId, "messages_read", {
        conversationId,
        readBy: userId,
        readAt,
    });

    return {
        message: "Messages marked as read successfully.",
        readAt,
    };
};

const deleteMessage = async (messageId: string, userId: string, deleteForEveryone: boolean = false) => {
    const message = await MessageModel.findById(messageId);
    if (!message) {
        throw new ApiError(httpStatus.NOT_FOUND, "Message was not found.");
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);
    const isSender = message.sender.toString() === userId;
    const isRecipient = message.recipient.toString() === userId;

    if (!isSender && !isRecipient) {
        throw new ApiError(httpStatus.FORBIDDEN, "You do not have permission to delete this message.");
    }

    if (deleteForEveryone) {
        if (!isSender) {
            throw new ApiError(httpStatus.FORBIDDEN, "Only the message sender can delete a message for everyone.");
        }
        await MessageModel.updateOne({ _id: messageId }, { $set: { isDeleted: true, text: "This message was deleted." } });
        emitToConversation(message.conversation.toString(), "message_deleted", { messageId, conversationId: message.conversation });
        return { message: "Message deleted for everyone successfully." };
    } else {
        await MessageModel.updateOne({ _id: messageId }, { $addToSet: { deletedFor: userObjectId } });
        return { message: "Message deleted for you successfully." };
    }
};

export const messageServices = {
    sendMessage,
    getConversationMessages,
    syncMessages,
    markMessagesAsRead,
    deleteMessage,
};
