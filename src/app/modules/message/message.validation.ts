import { z } from "zod";

const sendMessageZodSchema = z
    .object({
        conversationId: z
            .string()
            .regex(/^[0-9a-fA-F]{24}$/, "Invalid conversation ID format.")
            .optional(),
        recipientId: z
            .string()
            .regex(/^[0-9a-fA-F]{24}$/, "Invalid recipient ID format.")
            .optional(),
        listingId: z
            .string()
            .regex(/^[0-9a-fA-F]{24}$/, "Invalid listing ID format.")
            .optional(),
        messageType: z.enum(["TEXT", "IMAGE", "LOCATION"]).optional().default("TEXT"),
        text: z.string().max(5000, "Message cannot exceed 5000 characters.").optional(),
        attachments: z.array(z.string()).optional(),
        location: z
            .object({
                latitude: z.number().min(-90).max(90),
                longitude: z.number().min(-180).max(180),
                addressName: z.string().max(200).optional(),
            })
            .optional(),
    })
    .refine((data) => !!data.conversationId || !!data.recipientId, {
        message: "Either conversationId or recipientId must be provided.",
        path: ["conversationId"],
    })
    .refine(
        (data) => {
            const hasText = !!data.text && data.text.trim().length > 0;
            const hasAttachments = Array.isArray(data.attachments) && data.attachments.length > 0;
            const hasLocation = !!data.location;
            return hasText || hasAttachments || hasLocation;
        },
        {
            message: "Message must contain either text, attachments, or location coordinates.",
            path: ["text"],
        },
    );

export const messageValidations = {
    sendMessageZodSchema,
};
