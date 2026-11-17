import { z } from "zod";

const updateSiteSettingsZodSchema = z.object({
    siteName: z.string().min(1).max(100).optional(),
    siteTagline: z.string().max(200).optional(),
    siteLogo: z.string().optional(),
    siteFavicon: z.string().optional(),
    supportEmail: z.string().email().optional(),
    supportPhone: z.string().max(50).optional(),
    emergencyContact: z.string().max(50).optional(),
    officeAddress: z.string().max(300).optional(),
    socialLinks: z
        .object({
            facebook: z.string().optional(),
            instagram: z.string().optional(),
            twitter: z.string().optional(),
            youtube: z.string().optional(),
            linkedin: z.string().optional(),
            whatsapp: z.string().optional(),
        })
        .optional(),
    businessRules: z
        .object({
            platformCommissionRate: z.number().min(0).max(100).optional(),
            minimumBookingAdvanceHours: z.number().min(0).optional(),
            cancellationWindowHours: z.number().min(0).optional(),
            taxPercentage: z.number().min(0).max(100).optional(),
            defaultCurrency: z.string().max(10).optional(),
            currencySymbol: z.string().max(10).optional(),
        })
        .optional(),
    appSettings: z
        .object({
            minSupportedAppVersion: z.string().max(20).optional(),
            latestAppVersion: z.string().max(20).optional(),
            forceAppUpdate: z.boolean().optional(),
            appStoreUrl: z.string().url().optional().or(z.literal("")),
            playStoreUrl: z.string().url().optional().or(z.literal("")),
        })
        .optional(),
    maintenance: z
        .object({
            isMaintenanceMode: z.boolean().optional(),
            maintenanceMessage: z.string().max(500).optional(),
            expectedDowntimeEnd: z.string().datetime().nullable().optional(),
        })
        .optional(),
    seo: z
        .object({
            metaTitle: z.string().max(150).optional(),
            metaDescription: z.string().max(500).optional(),
            metaKeywords: z.array(z.string()).optional(),
        })
        .optional(),
});

export const siteSettingsValidations = {
    updateSiteSettingsZodSchema,
};
