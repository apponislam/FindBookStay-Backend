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
        coordinates: [number, number]; // [longitude, latitude] for MongoDB 2dsphere
    };
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
    referralCode?: string;
    referredBy?: Types.ObjectId | null;
    isActive: boolean;
    isEmailVerified: boolean;
    isDeleted: boolean;
    lastLogin?: Date;

    createdAt: Date;
    updatedAt: Date;
}
