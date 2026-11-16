import { z } from "zod";

const toggleFavoriteZodSchema = z.object({
    listing: z.string({ message: "Listing ID is required." }).min(1, "Listing ID is required."),
    note: z.string().max(300, "Note cannot exceed 300 characters.").optional(),
});

const updateFavoriteNoteZodSchema = z.object({
    note: z
        .string({ message: "Note is required." })
        .max(300, "Note cannot exceed 300 characters."),
});

export const favoriteValidations = {
    toggleFavoriteZodSchema,
    updateFavoriteNoteZodSchema,
};

