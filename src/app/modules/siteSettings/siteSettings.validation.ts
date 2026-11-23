import { z } from "zod";

const stringOrJson = <T extends z.ZodTypeAny>(schema: T) =>
    z.preprocess((val) => {
        if (typeof val === "string") {
            try {
                return JSON.parse(val);
            } catch {
                return val;
            }
        }
        return val;
    }, schema);

const updateSiteSettingsZodSchema = z.object({
    siteName: z.string().min(1).max(100).optional(),
    siteTagline: z.string().max(200).optional(),
    siteLogo: z.string().optional(),
    siteFavicon: z.string().optional(),
    supportEmail: z.string().email().optional(),
    supportPhone: z.string().max(50).optional(),
    emergencyContact: z.string().max(50).optional(),
    officeAddress: z.string().max(300).optional(),
    socialLinks: stringOrJson(
        z
            .object({
                facebook: z.string().optional(),
                instagram: z.string().optional(),
                twitter: z.string().optional(),
                youtube: z.string().optional(),
                linkedin: z.string().optional(),
                whatsapp: z.string().optional(),
                tiktok: z.string().optional(),
                telegram: z.string().optional(),
            })
            .optional(),
    ),
    businessRules: stringOrJson(
        z
            .object({
                platformCommissionRate: z.number().min(0).max(100).optional(),
                minimumBookingAdvanceHours: z.number().min(0).optional(),
                cancellationWindowHours: z.number().min(0).optional(),
                taxPercentage: z.number().min(0).max(100).optional(),
                defaultCurrency: z.string().max(10).optional(),
                currencySymbol: z.string().max(10).optional(),
                enableInstantBooking: z.boolean().optional(),
                securityDepositRequired: z.boolean().optional(),
            })
            .optional(),
    ),
    features: stringOrJson(
        z
            .object({
                enableHomes: z.boolean().optional(),
                enableStays: z.boolean().optional(),
                enableTurfs: z.boolean().optional(),
                enableProperties: z.boolean().optional(),
                enableTolets: z.boolean().optional(),
                enableReviews: z.boolean().optional(),
                enableDirectMessaging: z.boolean().optional(),
            })
            .optional(),
    ),
    appSettings: stringOrJson(
        z
            .object({
                minSupportedAppVersion: z.string().max(20).optional(),
                latestAppVersion: z.string().max(20).optional(),
                forceAppUpdate: z.boolean().optional(),
                appStoreUrl: z.string().url().optional().or(z.literal("")),
                playStoreUrl: z.string().url().optional().or(z.literal("")),
            })
            .optional(),
    ),
    maintenance: stringOrJson(
        z
            .object({
                isMaintenanceMode: z.boolean().optional(),
                maintenanceMessage: z.string().max(500).optional(),
                expectedDowntimeEnd: z.string().datetime().nullable().optional(),
            })
            .optional(),
    ),
    seo: stringOrJson(
        z
            .object({
                metaTitle: z.string().max(150).optional(),
                metaDescription: z.string().max(500).optional(),
                metaKeywords: z.array(z.string()).optional(),
                ogImage: z.string().optional(),
            })
            .optional(),
    ),
});

export const siteSettingsValidations = {
    updateSiteSettingsZodSchema,
};
