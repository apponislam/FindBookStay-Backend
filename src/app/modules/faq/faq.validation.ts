import { z } from "zod";
import { FAQCategory } from "./faq.interface";

const createFAQZodSchema = z.object({
    question: z
        .string({
            message: "Question is required.",
        })
        .min(5, "Question must be at least 5 characters.")
        .max(300, "Question cannot exceed 300 characters."),
    answer: z
        .string({
            message: "Answer is required.",
        })
        .min(5, "Answer must be at least 5 characters."),
    category: z.nativeEnum(FAQCategory).default(FAQCategory.GENERAL),
    tags: z.array(z.string()).optional(),
    order: z.number().int().default(0),
    isActive: z.boolean().default(true),
});

const updateFAQZodSchema = createFAQZodSchema.partial();

const reorderFAQZodSchema = z.object({
    items: z.array(
        z.object({
            id: z.string({ message: "FAQ ID is required." }),
            order: z.number().int({ message: "Order must be an integer." }),
        })
    ).min(1, "At least one FAQ item is required to reorder."),
});

const feedbackFAQZodSchema = z.object({
    type: z.enum(["helpful", "notHelpful"], {
        message: "Feedback type must be either 'helpful' or 'notHelpful'.",
    }),
});

export const faqValidations = {
    createFAQZodSchema,
    updateFAQZodSchema,
    reorderFAQZodSchema,
    feedbackFAQZodSchema,
};

