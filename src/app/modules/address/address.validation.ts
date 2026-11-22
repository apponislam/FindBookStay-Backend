import { z } from "zod";

const createAddressZodSchema = z.object({
    addressType: z.enum(["COUNTRY", "STATE", "CITY", "AREA", "ZONE"], {
        message: "Address type must be one of: COUNTRY, STATE, CITY, AREA, or ZONE.",
    }),
    address: z.string().min(1, "Address name is required.").max(200, "Address name cannot exceed 200 characters."),
    upperLevelAddress: z
        .string()
        .regex(/^[0-9a-fA-F]{24}$/, "Invalid parent address ID format.")
        .optional()
        .nullable(),
});

const updateAddressZodSchema = z.object({
    addressType: z.enum(["COUNTRY", "STATE", "CITY", "AREA", "ZONE"]).optional(),
    address: z.string().min(1, "Address name is required.").max(200).optional(),
    upperLevelAddress: z
        .string()
        .regex(/^[0-9a-fA-F]{24}$/, "Invalid parent address ID format.")
        .optional()
        .nullable(),
});

export const addressValidations = {
    createAddressZodSchema,
    updateAddressZodSchema,
};
