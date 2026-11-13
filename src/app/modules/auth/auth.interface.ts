import { Types } from "mongoose";

export type UserRole = "ADMIN" | "USER";

export interface User {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    phone?: string;
    profileImage?: string;
    language?: string;
    address?: {
        street?: string;
        city?: string;
        state?: string;
        zipCode?: string;
        country?: string;
        latitude?: number;
        longitude?: number;
        location?: {
            type: "Point";
            coordinates: [number, number]; // [longitude, latitude] for MongoDB GeoJSON
        };
    };
    isActive: boolean;
    isEmailVerified: boolean;
    isDeleted: boolean;
    lastLogin?: Date;

    // Password reset fields
    resetPasswordOtp?: string;
    resetPasswordOtpExpiry?: Date;
    resetPasswordToken?: string;
    resetPasswordTokenExpiry?: Date;

    // Email verification fields
    verificationToken?: string;
    verificationCode?: string;
    verificationExpiry?: Date;

    // Email update fields
    pendingEmail?: string;
    emailVerificationToken?: string;
    emailVerificationExpiry?: Date;

    createdAt: Date;
    updatedAt: Date;
}
