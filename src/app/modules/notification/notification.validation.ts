import { z } from "zod";

const sendNotificationZodSchema = z
    .object({
        recipientId: z
            .string()
            .regex(/^[0-9a-fA-F]{24}$/, "Invalid recipient ID format.")
            .optional(),
        broadcast: z.boolean().optional().default(false),
        targetRole: z.enum(["ALL", "USER", "ADMIN"]).optional().default("ALL"),
        type: z.enum(["BOOKING_CREATED", "BOOKING_CONFIRMED", "BOOKING_CANCELLED", "MESSAGE_RECEIVED", "PAYMENT_SUCCESS", "REVIEW_RECEIVED", "LISTING_APPROVED", "LISTING_REJECTED", "SYSTEM_ALERT", "PROMOTION", "GENERAL"]).optional().default("GENERAL"),
        title: z.string().min(1, "Notification title is required.").max(200, "Title cannot exceed 200 characters."),
        message: z.string().min(1, "Notification message is required.").max(2000, "Message cannot exceed 2000 characters."),
        image: z.string().optional(),
        link: z.string().max(500).optional(),
        data: z.record(z.string(), z.any()).optional(),
    })
    .refine((data) => data.broadcast || !!data.recipientId, {
        message: "Either recipientId must be provided or broadcast must be set to true.",
        path: ["recipientId"],
    });

export const notificationValidations = {
    sendNotificationZodSchema,
};
