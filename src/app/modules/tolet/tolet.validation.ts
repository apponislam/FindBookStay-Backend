import { z } from "zod";

const createToletZodSchema = z.object({
    title: z.string().min(2, "Title is required.").max(200).default("বাসা ভাড়া দেওয়া হইবে (TO-LET)"),
    rentType: z.string().min(2, "Rent type is required (e.g. ফ্যামিলি, ব্যাচেলর).").max(100),
    availableFrom: z.string().min(2, "Available from is required (e.g. ১লা জানুয়ারি).").max(100),
    floor: z.string().max(50).optional(),
    bedrooms: z.number().int().min(0, "Bedrooms cannot be negative."),
    bathrooms: z.number().int().min(0, "Bathrooms cannot be negative."),
    balconies: z.number().int().min(0).optional().default(0),
    facilities: z.array(z.string()).optional().default([]),
    rent: z.number().min(0, "Rent amount is required."),
    serviceCharge: z.number().min(0).optional().default(0),
    address: z.string().min(3, "Address is required.").max(300),
    contactNumber: z.string().min(6, "Contact phone number is required.").max(30),
    contactNumber2: z.string().max(30).optional(),
    notes: z.string().max(500).optional(),
});

const updateToletZodSchema = z.object({
    title: z.string().min(2).max(200).optional(),
    rentType: z.string().min(2).max(100).optional(),
    availableFrom: z.string().min(2).max(100).optional(),
    floor: z.string().max(50).optional(),
    bedrooms: z.number().int().min(0).optional(),
    bathrooms: z.number().int().min(0).optional(),
    balconies: z.number().int().min(0).optional(),
    facilities: z.array(z.string()).optional(),
    rent: z.number().min(0).optional(),
    serviceCharge: z.number().min(0).optional(),
    address: z.string().min(3).max(300).optional(),
    contactNumber: z.string().min(6).max(30).optional(),
    contactNumber2: z.string().max(30).optional(),
    notes: z.string().max(500).optional(),
});

export const toletValidations = {
    createToletZodSchema,
    updateToletZodSchema,
};
