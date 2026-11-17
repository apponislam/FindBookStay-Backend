import mongoose, { Schema } from "mongoose";
import { IMessage } from "./message.interface";

const MessageSchema = new Schema<IMessage>(
    {
        conversation: {
            type: Schema.Types.ObjectId,
            ref: "Conversation",
            required: [true, "Conversation ID is required."],
            index: true,
        },
        sender: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: [true, "Sender ID is required."],
            index: true,
        },
        recipient: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: [true, "Recipient ID is required."],
            index: true,
        },
        clientMessageId: {
            type: String,
            trim: true,
            default: null,
        },
        messageType: {
            type: String,
            enum: ["TEXT", "IMAGE"],
            default: "TEXT",
        },
        text: {
            type: String,
            trim: true,
            default: "",
        },
        attachments: {
            type: [String],
            default: [],
        },
        isRead: {
            type: Boolean,
            default: false,
            index: true,
        },
        readAt: {
            type: Date,
            default: null,
        },
        status: {
            type: String,
            enum: ["SENT", "DELIVERED", "READ"],
            default: "SENT",
        },
        isDeleted: {
            type: Boolean,
            default: false,
        },
        deletedFor: [
            {
                type: Schema.Types.ObjectId,
                ref: "User",
            },
        ],
    },
    {
        timestamps: true,
        versionKey: false,
    },
);

// High performance compound query indexes (single fields conversation, sender, recipient, isRead are indexed on fields)
MessageSchema.index({ conversation: 1, _id: -1 });
MessageSchema.index({ conversation: 1, createdAt: -1 });
MessageSchema.index({ conversation: 1, updatedAt: -1 });
MessageSchema.index({ recipient: 1, isRead: 1 });
MessageSchema.index({ clientMessageId: 1, sender: 1 }, { sparse: true });

export const MessageModel = mongoose.model<IMessage>("Message", MessageSchema);
