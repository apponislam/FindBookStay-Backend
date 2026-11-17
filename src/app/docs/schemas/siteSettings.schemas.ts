export const siteSettingsSchemas = {
    UpdateSiteSettingsRequest: {
        type: "object",
        properties: {
            siteName: { type: "string", example: "FindBookStay" },
            siteTagline: { type: "string", example: "Find, Book & Stay with Ease" },
            siteLogo: { type: "string", example: "/uploads/site/logo.webp" },
            siteFavicon: { type: "string", example: "/uploads/site/favicon.webp" },
            supportEmail: { type: "string", example: "support@findbookstay.com" },
            supportPhone: { type: "string", example: "+8801700000000" },
            emergencyContact: { type: "string", example: "+8801800000000" },
            officeAddress: { type: "string", example: "Banani, Dhaka, Bangladesh" },
            socialLinks: {
                type: "object",
                properties: {
                    facebook: { type: "string", example: "https://facebook.com/findbookstay" },
                    instagram: { type: "string", example: "https://instagram.com/findbookstay" },
                    twitter: { type: "string", example: "https://twitter.com/findbookstay" },
                    youtube: { type: "string", example: "https://youtube.com/@findbookstay" },
                    linkedin: { type: "string", example: "https://linkedin.com/company/findbookstay" },
                    whatsapp: { type: "string", example: "+8801700000000" },
                },
            },
            businessRules: {
                type: "object",
                properties: {
                    platformCommissionRate: { type: "number", example: 5 },
                    minimumBookingAdvanceHours: { type: "number", example: 2 },
                    cancellationWindowHours: { type: "number", example: 24 },
                    taxPercentage: { type: "number", example: 0 },
                    defaultCurrency: { type: "string", example: "BDT" },
                    currencySymbol: { type: "string", example: "৳" },
                },
            },
            appSettings: {
                type: "object",
                properties: {
                    minSupportedAppVersion: { type: "string", example: "1.0.0" },
                    latestAppVersion: { type: "string", example: "1.0.0" },
                    forceAppUpdate: { type: "boolean", example: false },
                    appStoreUrl: { type: "string", example: "https://apps.apple.com/app/id123456" },
                    playStoreUrl: { type: "string", example: "https://play.google.com/store/apps/details?id=com.findbookstay" },
                },
            },
            maintenance: {
                type: "object",
                properties: {
                    isMaintenanceMode: { type: "boolean", example: false },
                    maintenanceMessage: { type: "string", example: "Scheduled maintenance in progress." },
                    expectedDowntimeEnd: { type: "string", format: "date-time", nullable: true },
                },
            },
            seo: {
                type: "object",
                properties: {
                    metaTitle: { type: "string", example: "FindBookStay - Rent Homes, Stays & Turfs" },
                    metaDescription: { type: "string", example: "FindBookStay marketplace" },
                    metaKeywords: { type: "array", items: { type: "string" } },
                },
            },
        },
    },
    SiteSettingsResponse: {
        type: "object",
        properties: {
            success: { type: "boolean", example: true },
            message: { type: "string", example: "Site settings retrieved successfully." },
            data: {
                type: "object",
                properties: {
                    _id: { type: "string", example: "6670f123f8194b321a000008" },
                    siteName: { type: "string", example: "FindBookStay" },
                    siteTagline: { type: "string", example: "Find, Book & Stay with Ease" },
                    siteLogo: { type: "string", example: "/uploads/site/logo.webp" },
                    siteFavicon: { type: "string", example: "/uploads/site/favicon.webp" },
                    supportEmail: { type: "string", example: "support@findbookstay.com" },
                    supportPhone: { type: "string", example: "+8801700000000" },
                    emergencyContact: { type: "string", example: "+8801800000000" },
                    officeAddress: { type: "string", example: "Banani, Dhaka, Bangladesh" },
                    socialLinks: { type: "object" },
                    businessRules: { type: "object" },
                    appSettings: { type: "object" },
                    maintenance: { type: "object" },
                    seo: { type: "object" },
                    updatedBy: { type: "object", nullable: true },
                    createdAt: { type: "string", format: "date-time" },
                    updatedAt: { type: "string", format: "date-time" },
                },
            },
        },
    },
};

