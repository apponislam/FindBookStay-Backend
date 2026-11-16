import { z } from "zod";

const subRatingsValidationSchema = z.object({
    cleanliness: z.number().min(1).max(5).optional(),
    accuracy: z.number().min(1).max(5).optional(),
    communication: z.number().min(1).max(5).optional(),
    location: z.number().min(1).max(5).optional(),
    value: z.number().min(1).max(5).optional(),
});

const createReviewZodSchema = z.object({
    listing: z.string({ message: "Listing ID is required." }).min(1, "Listing ID is required."),
    rating: z
        .number({ message: "Rating is required." })
        .min(1, "Rating must be between 1 and 5.")
        .max(5, "Rating cannot exceed 5."),
    comment: z
        .string({ message: "Review comment is required." })
        .min(3, "Comment must be at least 3 characters.")
        .max(1000, "Comment cannot exceed 1000 characters."),
    images: z.array(z.string()).optional(),
    subRatings: subRatingsValidationSchema.optional(),
});

const updateReviewZodSchema = z.object({
    rating: z.number().min(1).max(5).optional(),
    comment: z.string().min(3).max(1000).optional(),
    images: z.array(z.string()).optional(),
    subRatings: subRatingsValidationSchema.optional(),
});

const replyReviewZodSchema = z.object({
    comment: z
        .string({ message: "Reply comment is required." })
        .min(2, "Reply comment must be at least 2 characters.")
        .max(1000, "Reply comment cannot exceed 1000 characters."),
});

export const reviewValidations = {
    createReviewZodSchema,
    updateReviewZodSchema,
    replyReviewZodSchema,
};
