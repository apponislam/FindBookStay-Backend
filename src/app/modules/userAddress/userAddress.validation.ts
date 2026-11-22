import { z } from "zod";

const createUserAddressZodSchema = z.object({
    type: z
        .enum(["HOME", "OFFICE", "COLLEGE", "OTHER"], {
            message: "Address type must be HOME, OFFICE, COLLEGE, or OTHER.",
        })
        .default("HOME"),
    customLabel: z.string().max(100).optional(),
    recipientName: z.string().max(100).optional(),
    phoneNumber: z.string().max(30).optional(),
    street: z.string().min(2, "Street address must be at least 2 characters.").max(300),
    apartment: z.string().max(100).optional(),
    area: z.string().max(100).optional(),
    city: z.string().min(1, "City is required.").max(100),
    state: z.string().max(100).optional(),
    zipCode: z.string().max(20).optional(),
    country: z.string().max(100).optional().default("Bangladesh"),
    location: z
        .object({
            type: z.literal("Point").default("Point"),
            coordinates: z.tuple([z.number(), z.number()]), // [longitude, latitude]
        })
        .optional(),
    isDefault: z.boolean().optional().default(false),
});

const updateUserAddressZodSchema = z.object({
    type: z.enum(["HOME", "OFFICE", "COLLEGE", "OTHER"]).optional(),
    customLabel: z.string().max(100).optional(),
    recipientName: z.string().max(100).optional(),
    phoneNumber: z.string().max(30).optional(),
    street: z.string().min(2).max(300).optional(),
    apartment: z.string().max(100).optional(),
    area: z.string().max(100).optional(),
    city: z.string().min(1).max(100).optional(),
    state: z.string().max(100).optional(),
    zipCode: z.string().max(20).optional(),
    country: z.string().max(100).optional(),
    location: z
        .object({
            type: z.literal("Point").default("Point"),
            coordinates: z.tuple([z.number(), z.number()]),
        })
        .optional(),
    isDefault: z.boolean().optional(),
});

export const userAddressValidations = {
    createUserAddressZodSchema,
    updateUserAddressZodSchema,
};
