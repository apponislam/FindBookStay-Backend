import { Types } from "mongoose";
import { User } from "../auth/auth.interface";

export interface ISocialLinks {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    youtube?: string;
    linkedin?: string;
    whatsapp?: string;
    tiktok?: string;
    telegram?: string;
}

export interface IBusinessRules {
    platformCommissionRate: number; // e.g. 5 (%)
    minimumBookingAdvanceHours: number; // e.g. 2 (hours)
    cancellationWindowHours: number; // e.g. 24 (hours)
    taxPercentage: number; // e.g. 0 (%)
    defaultCurrency: string; // e.g. "BDT"
    currencySymbol: string; // e.g. "৳"
    enableInstantBooking: boolean;
    securityDepositRequired: boolean;
}

export interface IFeatureFlags {
    enableHomes: boolean;
    enableStays: boolean;
    enableTurfs: boolean;
    enableProperties: boolean;
    enableTolets: boolean;
    enableReviews: boolean;
    enableDirectMessaging: boolean;
}

export interface IAppSettings {
    minSupportedAppVersion: string; // e.g. "1.0.0"
    latestAppVersion: string; // e.g. "1.0.0"
    forceAppUpdate: boolean;
    appStoreUrl?: string;
    playStoreUrl?: string;
}

export interface IMaintenanceSettings {
    isMaintenanceMode: boolean;
    maintenanceMessage?: string;
    expectedDowntimeEnd?: Date | null;
}

export interface ISeoSettings {
    metaTitle?: string;
    metaDescription?: string;
    metaKeywords?: string[];
    ogImage?: string;
}

export interface ISiteSettings {
    _id?: Types.ObjectId;
    siteName: string;
    siteTagline?: string;
    siteLogo?: string;
    siteFavicon?: string;
    supportEmail: string;
    supportPhone: string;
    emergencyContact?: string;
    officeAddress?: string;
    socialLinks: ISocialLinks;
    businessRules: IBusinessRules;
    features: IFeatureFlags;
    appSettings: IAppSettings;
    maintenance: IMaintenanceSettings;
    seo: ISeoSettings;
    updatedBy?: Types.ObjectId | User | null;
    createdAt?: Date;
    updatedAt?: Date;
}
