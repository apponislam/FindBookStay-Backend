import { z } from "zod";

const trackVisitorZodSchema = z.object({
    visitorId: z.string().max(128).optional(),
    platform: z.enum(["WEB", "ANDROID", "IOS", "APP", "UNKNOWN"]).optional().default("WEB"),
    device: z.enum(["Desktop", "Mobile", "Tablet", "Unknown"]).optional(),
    deviceModel: z.string().max(100).optional(),
    deviceBrand: z.string().max(100).optional(),
    appVersion: z.string().max(50).optional(),
    buildNumber: z.string().max(50).optional(),
    fcmToken: z.string().max(500).optional(),
    currentPath: z.string().max(500).optional().default("/"),
    currentScreen: z.string().max(200).optional(),
    referrer: z.string().max(500).optional().default("direct"),
    country: z.string().max(100).optional(),
    city: z.string().max(100).optional(),
    region: z.string().max(100).optional(),
    metadata: z.record(z.string(), z.any()).optional(),
});

export const visitorValidations = {
    trackVisitorZodSchema,
};
