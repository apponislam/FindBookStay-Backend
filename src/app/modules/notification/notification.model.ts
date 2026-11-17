import mongoose, { Schema } from "mongoose";
import { INotification } from "./notification.interface";

const NotificationSchema = new Schema<INotification>(
    {
        recipient: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: [true, "Recipient user ID is required."],
            index: true,
        },
        sender: {
            type: Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        type: {
            type: String,
            enum: [
                "BOOKING_CREATED",
                "BOOKING_CONFIRMED",
                "BOOKING_CANCELLED",
                "MESSAGE_RECEIVED",
                "PAYMENT_SUCCESS",
                "REVIEW_RECEIVED",
                "LISTING_APPROVED",
                "LISTING_REJECTED",
                "SYSTEM_ALERT",
                "PROMOTION",
                "GENERAL",
            ],
            default: "GENERAL",
        },
        title: {
            type: String,
            required: [true, "Notification title is required."],
            trim: true,
        },
        message: {
            type: String,
            required: [true, "Notification message is required."],
            trim: true,
        },
        image: {
            type: String,
            default: null,
            trim: true,
        },
        link: {
            type: String,
            default: null,
            trim: true,
        },
        data: {
            type: Schema.Types.Mixed,
            default: {},
        },
        isRead: {
            type: Boolean,
            default: false,
        },
        readAt: {
            type: Date,
            default: null,
        },
        isDeleted: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    },
);

// High-performance query indexes for fast inbox retrieval & unread counts
NotificationSchema.index({ recipient: 1, createdAt: -1 });
NotificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

export const NotificationModel = mongoose.model<INotification>("Notification", NotificationSchema);

