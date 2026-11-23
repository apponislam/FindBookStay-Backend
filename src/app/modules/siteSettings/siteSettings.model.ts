import mongoose, { Schema } from "mongoose";
import { ISiteSettings } from "./siteSettings.interface";

const SocialLinksSchema = new Schema(
    {
        facebook: { type: String, default: "", trim: true },
        instagram: { type: String, default: "", trim: true },
        twitter: { type: String, default: "", trim: true },
        youtube: { type: String, default: "", trim: true },
        linkedin: { type: String, default: "", trim: true },
        whatsapp: { type: String, default: "", trim: true },
        tiktok: { type: String, default: "", trim: true },
        telegram: { type: String, default: "", trim: true },
    },
    { _id: false },
);

const BusinessRulesSchema = new Schema(
    {
        platformCommissionRate: { type: Number, default: 5, min: 0, max: 100 },
        minimumBookingAdvanceHours: { type: Number, default: 2, min: 0 },
        cancellationWindowHours: { type: Number, default: 24, min: 0 },
        taxPercentage: { type: Number, default: 0, min: 0, max: 100 },
        defaultCurrency: { type: String, default: "BDT", trim: true, uppercase: true },
        currencySymbol: { type: String, default: "৳", trim: true },
        enableInstantBooking: { type: Boolean, default: true },
        securityDepositRequired: { type: Boolean, default: false },
    },
    { _id: false },
);

const FeatureFlagsSchema = new Schema(
    {
        enableHomes: { type: Boolean, default: true },
        enableStays: { type: Boolean, default: true },
        enableTurfs: { type: Boolean, default: true },
        enableProperties: { type: Boolean, default: true },
        enableTolets: { type: Boolean, default: true },
        enableReviews: { type: Boolean, default: true },
        enableDirectMessaging: { type: Boolean, default: true },
    },
    { _id: false },
);

const AppSettingsSchema = new Schema(
    {
        minSupportedAppVersion: { type: String, default: "1.0.0", trim: true },
        latestAppVersion: { type: String, default: "1.0.0", trim: true },
        forceAppUpdate: { type: Boolean, default: false },
        appStoreUrl: { type: String, default: "", trim: true },
        playStoreUrl: { type: String, default: "", trim: true },
    },
    { _id: false },
);

const MaintenanceSchema = new Schema(
    {
        isMaintenanceMode: { type: Boolean, default: false },
        maintenanceMessage: {
            type: String,
            default: "We are currently undergoing scheduled maintenance. Please check back shortly.",
            trim: true,
        },
        expectedDowntimeEnd: { type: Date, default: null },
    },
    { _id: false },
);

const SeoSchema = new Schema(
    {
        metaTitle: {
            type: String,
            default: "FindBookStay - Find, Book & Rent Homes, Stays, Turfs & Properties",
            trim: true,
        },
        metaDescription: {
            type: String,
            default:
                "FindBookStay is your premier platform to find, book, and enjoy residential homes, temporary stays, vacation rentals, sports turfs, and commercial & residential properties.",
            trim: true,
        },
        metaKeywords: {
            type: [String],
            default: ["homes", "stays", "turfs", "properties", "rent", "tolet", "booking", "apartment", "hotel", "bangladesh"],
        },
        ogImage: { type: String, default: "/public/og-image.png", trim: true },
    },
    { _id: false },
);

const SiteSettingsSchema = new Schema<ISiteSettings>(
    {
        siteName: {
            type: String,
            default: "FindBookStay",
            trim: true,
            required: true,
        },
        siteTagline: {
            type: String,
            default: "Find, Book & Stay with Ease",
            trim: true,
        },
        siteLogo: {
            type: String,
            default: "/public/logo.png",
            trim: true,
        },
        siteFavicon: {
            type: String,
            default: "/public/favicon.ico",
            trim: true,
        },
        supportEmail: {
            type: String,
            default: "support@findbookstay.com",
            trim: true,
            lowercase: true,
        },
        supportPhone: {
            type: String,
            default: "+8801700000000",
            trim: true,
        },
        emergencyContact: {
            type: String,
            default: "",
            trim: true,
        },
        officeAddress: {
            type: String,
            default: "Banani, Dhaka, Bangladesh",
            trim: true,
        },
        socialLinks: {
            type: SocialLinksSchema,
            default: () => ({}),
        },
        businessRules: {
            type: BusinessRulesSchema,
            default: () => ({}),
        },
        features: {
            type: FeatureFlagsSchema,
            default: () => ({}),
        },
        appSettings: {
            type: AppSettingsSchema,
            default: () => ({}),
        },
        maintenance: {
            type: MaintenanceSchema,
            default: () => ({}),
        },
        seo: {
            type: SeoSchema,
            default: () => ({}),
        },
        updatedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    },
);

export const SiteSettingsModel = mongoose.model<ISiteSettings>("SiteSettings", SiteSettingsSchema);
