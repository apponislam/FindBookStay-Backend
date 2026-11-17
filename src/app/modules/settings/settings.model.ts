import mongoose, { Schema } from "mongoose";
import { ISettings } from "./settings.interface";

const NotificationSubSchema = new Schema(
    {
        emailNotifications: {
            bookings: { type: Boolean, default: true },
            messages: { type: Boolean, default: true },
            promotions: { type: Boolean, default: false },
            accountAlerts: { type: Boolean, default: true },
        },
        pushNotifications: {
            bookings: { type: Boolean, default: true },
            messages: { type: Boolean, default: true },
            promotions: { type: Boolean, default: false },
            reminders: { type: Boolean, default: true },
        },
        smsNotifications: {
            bookingAlerts: { type: Boolean, default: true },
            securityAlerts: { type: Boolean, default: true },
        },
    },
    { _id: false },
);

const PrivacySubSchema = new Schema(
    {
        showProfilePublicly: { type: Boolean, default: true },
        showOnlineStatus: { type: Boolean, default: true },
        showLastSeen: { type: Boolean, default: true },
        allowDirectMessages: { type: Boolean, default: true },
    },
    { _id: false },
);

const PreferencesSubSchema = new Schema(
    {
        theme: {
            type: String,
            enum: ["light", "dark", "system"],
            default: "system",
        },
        language: {
            type: String,
            default: "en",
            trim: true,
        },
        currency: {
            type: String,
            default: "BDT",
            trim: true,
            uppercase: true,
        },
        timezone: {
            type: String,
            default: "Asia/Dhaka",
            trim: true,
        },
    },
    { _id: false },
);

const SettingsSchema = new Schema<ISettings>(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: [true, "User ID is required for settings."],
            unique: true,
        },
        notifications: {
            type: NotificationSubSchema,
            default: () => ({}),
        },
        privacy: {
            type: PrivacySubSchema,
            default: () => ({}),
        },
        preferences: {
            type: PreferencesSubSchema,
            default: () => ({}),
        },
    },
    {
        timestamps: true,
        versionKey: false,
    },
);

export const SettingsModel = mongoose.model<ISettings>("Settings", SettingsSchema);

