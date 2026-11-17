import { z } from "zod";

const createConversationZodSchema = z.object({
    recipientId: z.string({ message: "Recipient ID is required." }).regex(/^[0-9a-fA-F]{24}$/, "Invalid recipient user ID format."),
    listingId: z
        .string()
        .regex(/^[0-9a-fA-F]{24}$/, "Invalid listing ID format.")
        .optional(),
    initialMessage: z.string().max(2000, "Initial message cannot exceed 2000 characters.").optional(),
});

export const conversationValidations = {
    createConversationZodSchema,
};
