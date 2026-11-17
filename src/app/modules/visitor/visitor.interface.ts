import { Types } from "mongoose";
import { User } from "../auth/auth.interface";

export type DeviceType = "Desktop" | "Mobile" | "Tablet" | "Unknown";

export interface IVisitorSession {
    path: string;
    referrer?: string;
    timestamp: Date;
}

export interface IVisitor {
    _id?: Types.ObjectId;
    visitorId?: string; // Unique visitor code (auto-generated in model pre-save hook like referral code)
    user?: Types.ObjectId | User | null;
    ipAddress?: string | null;
    userAgent?: string | null;
    device: DeviceType;
    browser?: string;
    os?: string;
    country?: string;
    city?: string;
    region?: string;
    currentPath: string;
    referrer?: string;
    visitCount: number;
    firstVisit: Date;
    lastVisit: Date;
    recentVisits?: IVisitorSession[];
    metadata?: Record<string, any>;
    createdAt?: Date;
    updatedAt?: Date;
}
