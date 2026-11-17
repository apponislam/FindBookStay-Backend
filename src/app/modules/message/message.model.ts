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
        messageType: {
            type: String,
            enum: ["TEXT", "IMAGE", "LOCATION"],
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
        location: {
            latitude: Number,
            longitude: Number,
            addressName: String,
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

// High performance query indexes
MessageSchema.index({ conversation: 1, createdAt: -1 });
MessageSchema.index({ conversation: 1, createdAt: 1 });
MessageSchema.index({ recipient: 1, isRead: 1 });
MessageSchema.index({ sender: 1 });

export const MessageModel = mongoose.model<IMessage>("Message", MessageSchema);
