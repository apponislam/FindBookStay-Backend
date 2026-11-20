import { Types } from "mongoose";

export type UserRole = "ADMIN" | "USER";

export interface Address {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
    location?: {
        type: "Point";
        coordinates: [number, number]; // [longitude, latitude]
    };
}

export interface ILiveLocation {
    type: "Point";
    coordinates: [number, number]; // [longitude, latitude]
    updatedAt?: Date;
    heading?: number; // Device compass direction in degrees (0 - 360)
    speed?: number; // Speed in m/s
}

export interface IDeviceSession {
    deviceId: string;
    userAgent?: string;
    ipAddress?: string;
    lastUsedAt: Date;
    isTrusted: boolean;
}

export interface User {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    phone?: string;
    profileImage?: string;
    language?: string;
    presentAddress?: Address;
    permanentAddress?: Address;
    liveLocation?: ILiveLocation;
    referralCode?: string;
    referredBy?: Types.ObjectId | null;
    isWrongReferral: boolean;
    wrongReferralCode?: string | null;
    fcmTokens?: string[];
    hasHome: boolean;
    hasStay: boolean;
    hasTurf: boolean;
    hasProperty: boolean;
    isActive: boolean;
    disabledReason?: string | null;
    disabledAt?: Date | null;
    disabledBy?: Types.ObjectId | null;
    isEmailVerified: boolean;
    isDeleted: boolean;
    lastLogin?: Date;
    lastLoginIp?: string;
    knownDevices?: IDeviceSession[];

    createdAt: Date;
    updatedAt: Date;
}
