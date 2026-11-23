import { z } from "zod";

const updateSettingsZodSchema = z.object({
    notifications: z
        .object({
            emailNotifications: z
                .object({
                    bookings: z.boolean().optional(),
                    messages: z.boolean().optional(),
                    promotions: z.boolean().optional(),
                    accountAlerts: z.boolean().optional(),
                    reminders: z.boolean().optional(),
                    newsletter: z.boolean().optional(),
                })
                .optional(),
            pushNotifications: z
                .object({
                    bookings: z.boolean().optional(),
                    messages: z.boolean().optional(),
                    promotions: z.boolean().optional(),
                    reminders: z.boolean().optional(),
                    chatMessages: z.boolean().optional(),
                })
                .optional(),
            smsNotifications: z
                .object({
                    bookingAlerts: z.boolean().optional(),
                    securityAlerts: z.boolean().optional(),
                    otpAlerts: z.boolean().optional(),
                })
                .optional(),
        })
        .optional(),
    privacy: z
        .object({
            showProfilePublicly: z.boolean().optional(),
            showOnlineStatus: z.boolean().optional(),
            showLastSeen: z.boolean().optional(),
            allowDirectMessages: z.boolean().optional(),
            showPhoneNumber: z.boolean().optional(),
        })
        .optional(),
    preferences: z
        .object({
            theme: z.enum(["light", "dark", "system"]).optional(),
            language: z.string().max(10).optional(),
            currency: z.string().max(10).optional(),
            timezone: z.string().max(50).optional(),
            distanceUnit: z.enum(["km", "miles"]).optional(),
            preferredCategories: z.array(z.string()).optional(),
        })
        .optional(),
});

export const settingsValidations = {
    updateSettingsZodSchema,
};
