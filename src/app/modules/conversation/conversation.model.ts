import mongoose, { Schema } from "mongoose";
import { IConversation } from "./conversation.interface";

const ConversationSchema = new Schema<IConversation>(
    {
        participants: [
            {
                type: Schema.Types.ObjectId,
                ref: "User",
                required: true,
            },
        ],
        listing: {
            type: Schema.Types.ObjectId,
            ref: "Listing",
            default: null,
        },
        lastMessage: {
            type: Schema.Types.ObjectId,
            ref: "Message",
            default: null,
        },
        lastMessageText: {
            type: String,
            default: "",
            trim: true,
        },
        lastMessageAt: {
            type: Date,
            default: Date.now,
        },
        unreadCounts: {
            type: Schema.Types.Mixed,
            default: {},
        },
        archivedBy: [
            {
                type: Schema.Types.ObjectId,
                ref: "User",
            },
        ],
        isBlocked: {
            type: Boolean,
            default: false,
        },
        blockedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    },
);

// Indexes for fast lookup & conversation listing
ConversationSchema.index({ participants: 1 });
ConversationSchema.index({ lastMessageAt: -1 });
ConversationSchema.index({ listing: 1 });
ConversationSchema.index({ participants: 1, listing: 1 });

export const ConversationModel = mongoose.model<IConversation>("Conversation", ConversationSchema);
