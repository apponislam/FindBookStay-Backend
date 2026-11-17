import { Types } from "mongoose";
import { User } from "../auth/auth.interface";

export type DeviceType = "Desktop" | "Mobile" | "Tablet" | "Unknown";

export type ClientPlatform = "WEB" | "ANDROID" | "IOS" | "APP" | "UNKNOWN";

export interface IVisitorSession {
    path: string; // URL path for web (e.g., '/listings') or screen/route for mobile (e.g., 'HomeScreen')
    screenName?: string; // Optional screen name for mobile app tracking (e.g., 'ListingDetailScreen')
    referrer?: string;
    timestamp: Date;
}

export interface IVisitor {
    _id?: Types.ObjectId;
    visitorId?: string; // Unique visitor code (auto-generated in model pre-save hook)
    user?: Types.ObjectId | User | null;
    ipAddress?: string | null;
    userAgent?: string | null;

    // Platform & Device details (Website vs. Mobile App)
    platform: ClientPlatform;
    device: DeviceType;
    browser?: string;
    os?: string;

    // Mobile App specific attributes
    appVersion?: string;
    buildNumber?: string;
    deviceModel?: string; // e.g. "iPhone 15 Pro", "Samsung S24 Ultra", "Pixel 8"
    deviceBrand?: string; // e.g. "Apple", "Samsung", "Google"
    fcmToken?: string; // Push notification token for mobile app visitors

    // Location
    country?: string;
    city?: string;
    region?: string;

    // Navigation tracking
    currentPath: string; // URL path for web or screen route for mobile
    currentScreen?: string; // Mobile screen identifier
    referrer?: string;

    // Analytics metrics
    visitCount: number;
    firstVisit: Date;
    lastVisit: Date;
    recentVisits?: IVisitorSession[];
    metadata?: Record<string, any>;
    createdAt?: Date;
    updatedAt?: Date;
}
