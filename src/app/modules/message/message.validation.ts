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
        messageType: z.enum(["TEXT", "IMAGE"]).optional().default("TEXT"),
        text: z.string().max(5000, "Message cannot exceed 5000 characters.").optional(),
        attachments: z.array(z.string()).optional(),
    })
    .refine((data) => !!data.conversationId || !!data.recipientId, {
        message: "Either conversationId or recipientId must be provided.",
        path: ["conversationId"],
    })
    .refine(
        (data) => {
            const hasText = !!data.text && data.text.trim().length > 0;
            const hasAttachments = Array.isArray(data.attachments) && data.attachments.length > 0;
            return hasText || hasAttachments;
        },
        {
            message: "Message must contain either text or image attachments.",
            path: ["text"],
        },
    );

export const messageValidations = {
    sendMessageZodSchema,
};
