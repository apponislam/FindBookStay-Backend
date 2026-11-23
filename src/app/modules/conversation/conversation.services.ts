import mongoose from "mongoose";
import httpStatus from "http-status";
import ApiError from "../../../errors/ApiError";
import { ConversationModel } from "./conversation.model";
import { UserModel } from "../auth/auth.model";
import { HomeModel } from "../home/home.model";
import { StayModel } from "../stay/stay.model";
import { TurfModel } from "../turf/turf.model";
import { PropertyModel } from "../property/property.model";
import { emitToUser } from "../../../utils/socket";

const createOrGetConversation = async (userId: string, recipientId: string, listingId?: string, initialMessage?: string) => {
    if (userId === recipientId) {
        throw new ApiError(httpStatus.BAD_REQUEST, "You cannot start a conversation with yourself.");
    }

    const recipient = await UserModel.findOne({ _id: recipientId, isDeleted: false });
    if (!recipient) {
        throw new ApiError(httpStatus.NOT_FOUND, "Recipient user account was not found.");
    }

    if (listingId && mongoose.Types.ObjectId.isValid(listingId)) {
        const [home, stay, turf, property] = await Promise.all([
            HomeModel.findOne({ _id: listingId, isDeleted: false }),
            StayModel.findOne({ _id: listingId, isDeleted: false }),
            TurfModel.findOne({ _id: listingId, isDeleted: false }),
            PropertyModel.findOne({ _id: listingId, isDeleted: false }),
        ]);
        if (!home && !stay && !turf && !property) {
            throw new ApiError(httpStatus.NOT_FOUND, "Referenced listing was not found.");
        }
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);
    const recipientObjectId = new mongoose.Types.ObjectId(recipientId);

    // Look for existing conversation between these 2 users (optionally linked to this listing)
    const filter: any = {
        participants: { $all: [userObjectId, recipientObjectId], $size: 2 },
    };

    if (listingId && mongoose.Types.ObjectId.isValid(listingId)) {
        filter.listing = new mongoose.Types.ObjectId(listingId);
    } else {
        filter.listing = null;
    }

    let conversation = await ConversationModel.findOne(filter);

    let isNew = false;
    if (!conversation) {
        conversation = await ConversationModel.create({
            participants: [userObjectId, recipientObjectId],
            listing: listingId && mongoose.Types.ObjectId.isValid(listingId) ? new mongoose.Types.ObjectId(listingId) : null,
            unreadCounts: {
                [userId]: 0,
                [recipientId]: 0,
            },
            lastMessageAt: new Date(),
        });
        isNew = true;
    }

    // Unarchive if it was archived for the sender
    if (conversation.archivedBy && conversation.archivedBy.some((id) => id.toString() === userId)) {
        await ConversationModel.updateOne({ _id: conversation._id }, { $pull: { archivedBy: userObjectId } });
    }

    const populated = await ConversationModel.findById(conversation._id).populate("participants", "name email role profileImage isEmailVerified phone").populate("listing", "title price images listingType status");

    if (isNew) {
        emitToUser(recipientId, "new_conversation", populated);
    }

    return populated;
};

const getUserConversations = async (userId: string, query: Record<string, any>) => {
    const { page = 1, limit = 20, archived = "false" } = query;
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const filter: any = {
        participants: userObjectId,
    };

    if (archived === "true" || archived === true) {
        filter.archivedBy = userObjectId;
    } else {
        filter.archivedBy = { $ne: userObjectId };
    }

    const pageNumber = Math.max(1, Number(page));
    const limitNumber = Math.max(1, Number(limit));
    const skip = (pageNumber - 1) * limitNumber;

    const [conversations, total] = await Promise.all([ConversationModel.find(filter).sort({ lastMessageAt: -1 }).skip(skip).limit(limitNumber).populate("participants", "name email role profileImage isEmailVerified phone").populate("listing", "title price images listingType status").lean(), ConversationModel.countDocuments(filter)]);

    const totalPages = Math.ceil(total / limitNumber);

    return {
        data: conversations,
        meta: {
            page: pageNumber,
            limit: limitNumber,
            total,
            totalPages,
            hasNext: pageNumber < totalPages,
            hasPrev: pageNumber > 1,
        },
    };
};

const getConversationById = async (conversationId: string, userId: string) => {
    const conversation = await ConversationModel.findById(conversationId).populate("participants", "name email role profileImage isEmailVerified phone").populate("listing", "title price images listingType status");

    if (!conversation) {
        throw new ApiError(httpStatus.NOT_FOUND, "Conversation not found.");
    }

    const isParticipant = conversation.participants.some((p: any) => p._id.toString() === userId || p.toString() === userId);

    if (!isParticipant) {
        throw new ApiError(httpStatus.FORBIDDEN, "You do not have permission to view this conversation.");
    }

    return conversation;
};

const toggleArchiveConversation = async (conversationId: string, userId: string) => {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const conversation = await ConversationModel.findById(conversationId);

    if (!conversation) {
        throw new ApiError(httpStatus.NOT_FOUND, "Conversation not found.");
    }

    const isParticipant = conversation.participants.some((p: any) => p.toString() === userId || p._id?.toString() === userId);

    if (!isParticipant) {
        throw new ApiError(httpStatus.FORBIDDEN, "You are not a participant in this conversation.");
    }

    const isArchived = conversation.archivedBy?.some((id) => id.toString() === userId);

    if (isArchived) {
        await ConversationModel.updateOne({ _id: conversationId }, { $pull: { archivedBy: userObjectId } });
        return { message: "Conversation unarchived successfully.", isArchived: false };
    } else {
        await ConversationModel.updateOne({ _id: conversationId }, { $addToSet: { archivedBy: userObjectId } });
        return { message: "Conversation archived successfully.", isArchived: true };
    }
};

const toggleBlockConversation = async (conversationId: string, userId: string) => {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const conversation = await ConversationModel.findById(conversationId);

    if (!conversation) {
        throw new ApiError(httpStatus.NOT_FOUND, "Conversation not found.");
    }

    const isParticipant = conversation.participants.some((p: any) => p.toString() === userId || p._id?.toString() === userId);

    if (!isParticipant) {
        throw new ApiError(httpStatus.FORBIDDEN, "You are not a participant in this conversation.");
    }

    if (conversation.isBlocked) {
        if (conversation.blockedBy && conversation.blockedBy.toString() !== userId) {
            throw new ApiError(httpStatus.FORBIDDEN, "You cannot unblock a conversation blocked by the other user.");
        }
        conversation.isBlocked = false;
        conversation.blockedBy = null;
        await conversation.save();
        return { message: "Conversation unblocked successfully.", isBlocked: false };
    } else {
        conversation.isBlocked = true;
        conversation.blockedBy = userObjectId;
        await conversation.save();
        return { message: "Conversation blocked successfully.", isBlocked: true };
    }
};

export const conversationServices = {
    createOrGetConversation,
    getUserConversations,
    getConversationById,
    toggleArchiveConversation,
    toggleBlockConversation,
};
