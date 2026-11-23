import { Types } from "mongoose";
import { User } from "../auth/auth.interface";

export type ThemeType = "light" | "dark" | "system";
export type DistanceUnitType = "km" | "miles";

export interface INotificationSettings {
    emailNotifications: {
        bookings: boolean;
        messages: boolean;
        promotions: boolean;
        accountAlerts: boolean;
        reminders: boolean;
        newsletter: boolean;
    };
    pushNotifications: {
        bookings: boolean;
        messages: boolean;
        promotions: boolean;
        reminders: boolean;
        chatMessages: boolean;
    };
    smsNotifications: {
        bookingAlerts: boolean;
        securityAlerts: boolean;
        otpAlerts: boolean;
    };
}

export interface IPrivacySettings {
    showProfilePublicly: boolean;
    showOnlineStatus: boolean;
    showLastSeen: boolean;
    allowDirectMessages: boolean;
    showPhoneNumber: boolean;
}

export interface IPreferencesSettings {
    theme: ThemeType;
    language: string;
    currency: string;
    timezone: string;
    distanceUnit: DistanceUnitType;
    preferredCategories: string[];
}

export interface ISettings {
    _id?: Types.ObjectId;
    user: Types.ObjectId | User;
    notifications: INotificationSettings;
    privacy: IPrivacySettings;
    preferences: IPreferencesSettings;
    createdAt?: Date;
    updatedAt?: Date;
}
