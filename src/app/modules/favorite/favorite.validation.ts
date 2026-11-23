import { z } from "zod";

const toggleFavoriteZodSchema = z
    .object({
        listing: z.string().optional(),
        listingId: z.string().optional(),
        category: z.string().optional(),
        itemModel: z.enum(["Home", "Stay", "Turf", "Property"]).optional(),
    })
    .refine((data) => !!(data.listing || data.listingId), {
        message: "Either listing or listingId is required.",
        path: ["listing"],
    });

const updateFavoriteNoteZodSchema = z.object({
    note: z.string({ message: "Note is required." }).max(300, "Note cannot exceed 300 characters."),
});

export const favoriteValidations = {
    toggleFavoriteZodSchema,
    updateFavoriteNoteZodSchema,
};
