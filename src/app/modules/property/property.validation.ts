import { z } from "zod";
import {
    PropertyType,
    OwnershipType,
    CompletionStatus,
    PriceUnit,
    AvailabilityStatus,
} from "./property.interface";

const geoSchema = z.object({
    type: z.literal("Point").default("Point"),
    coordinates: z.tuple([z.number(), z.number()]).default([90.4125, 23.8103]),
});

const locationValidationSchema = z.object({
    address: z.string({ message: "Address is required." }).min(2, "Address must be at least 2 characters."),
    area: z.string({ message: "Area is required." }).min(2, "Area must be at least 2 characters."),
    city: z.string({ message: "City is required." }).min(2, "City must be at least 2 characters."),
    state: z.string().optional(),
    zipCode: z.string().optional(),
    country: z.string().default("Bangladesh"),
    geo: geoSchema.optional(),
});

const propertyHighlightValidationSchema = z.object({
    title: z.string().min(1, "Highlight title is required."),
    description: z.string().min(1, "Highlight description is required."),
});

const bookingRulesValidationSchema = z.object({
    requiresApproval: z.boolean().optional(),
    advanceBookingHours: z.number().min(0).optional(),
    allowSameDayBooking: z.boolean().optional(),
    minimumAdvancePayment: z.number().min(0).optional(),
});

const createPropertyZodSchema = z.object({
    body: z.object({
        owner: z.string().optional(),
        propertyType: z.nativeEnum(PropertyType, { message: "Invalid propertyType." }),
        ownershipType: z.nativeEnum(OwnershipType).default(OwnershipType.FREEHOLD),
        title: z.string({ message: "Title is required." }).min(5).max(200),
        description: z.string({ message: "Description is required." }).min(10),
        highlights: z.array(propertyHighlightValidationSchema).optional(),
        images: z.array(z.string()).default([]),
        featuredImage: z.string().optional(),
        videoUrl: z.string().url().optional().or(z.literal("")),
        virtualTourUrl: z.string().url().optional().or(z.literal("")),
        price: z.number({ message: "Price is required." }).min(0),
        originalPrice: z.number().min(0).optional(),
        priceUnit: z.nativeEnum(PriceUnit).default(PriceUnit.TOTAL),
        currency: z.string().default("BDT"),
        securityDeposit: z.number().min(0).optional(),
        isNegotiable: z.boolean().optional(),
        location: locationValidationSchema,
        contactPhone: z.string({ message: "Contact phone is required." }).min(11),
        contactEmail: z.string().email().optional().or(z.literal("")),
        amenities: z.array(z.string()).default([]),
        rules: z.array(z.string()).optional(),
        nearbyPlaces: z.array(z.string()).optional(),
        bookingEnabled: z.boolean().default(false),
        bookingRules: bookingRulesValidationSchema.optional(),

        // Property-specific attributes
        landAreaSqFt: z.number().min(0).optional(),
        flatSizeSqFt: z.number().min(0).optional(),
        bedrooms: z.number().min(0).optional(),
        bathrooms: z.number().min(0).optional(),
        balconies: z.number().min(0).optional(),
        parkingSpaces: z.number().min(0).optional(),
        facingDirection: z.string().optional(),
        roadWidth: z.number().min(0).optional(),
        completionStatus: z.nativeEnum(CompletionStatus).default(CompletionStatus.READY),
        handoverDate: z.union([z.string(), z.date()]).optional(),
        registeredDeedReady: z.boolean().default(true),
        developerName: z.string().optional(),
        propertyDetails: z.record(z.string(), z.any()).optional(),
    }),
});

const updatePropertyZodSchema = z.object({
    body: z.object({
        owner: z.string().optional(),
        propertyType: z.nativeEnum(PropertyType).optional(),
        ownershipType: z.nativeEnum(OwnershipType).optional(),
        title: z.string().min(5).max(200).optional(),
        description: z.string().min(10).optional(),
        highlights: z.array(propertyHighlightValidationSchema).optional(),
        images: z.array(z.string()).optional(),
        featuredImage: z.string().optional(),
        videoUrl: z.string().url().optional().or(z.literal("")),
        virtualTourUrl: z.string().url().optional().or(z.literal("")),
        price: z.number().min(0).optional(),
        originalPrice: z.number().min(0).optional(),
        priceUnit: z.nativeEnum(PriceUnit).optional(),
        currency: z.string().optional(),
        securityDeposit: z.number().min(0).optional(),
        isNegotiable: z.boolean().optional(),
        location: locationValidationSchema.partial().optional(),
        contactPhone: z.string().min(11).optional(),
        contactEmail: z.string().email().optional().or(z.literal("")),
        amenities: z.array(z.string()).optional(),
        rules: z.array(z.string()).optional(),
        nearbyPlaces: z.array(z.string()).optional(),
        bookingEnabled: z.boolean().optional(),
        bookingRules: bookingRulesValidationSchema.optional(),

        landAreaSqFt: z.number().min(0).optional(),
        flatSizeSqFt: z.number().min(0).optional(),
        bedrooms: z.number().min(0).optional(),
        bathrooms: z.number().min(0).optional(),
        balconies: z.number().min(0).optional(),
        parkingSpaces: z.number().min(0).optional(),
        facingDirection: z.string().optional(),
        roadWidth: z.number().min(0).optional(),
        completionStatus: z.nativeEnum(CompletionStatus).optional(),
        handoverDate: z.union([z.string(), z.date()]).optional(),
        registeredDeedReady: z.boolean().optional(),
        developerName: z.string().optional(),
        propertyDetails: z.record(z.string(), z.any()).optional(),
    }),
});

const updateAvailabilityStatusZodSchema = z.object({
    body: z.object({
        availabilityStatus: z.nativeEnum(AvailabilityStatus, {
            message: "Invalid availability status. Must be AVAILABLE, BOOKED, or SOLD.",
        }),
    }),
});

const approveOrRejectPropertyZodSchema = z.object({
    body: z.object({
        action: z.enum(["APPROVE", "REJECT"], {
            message: "Action must be either APPROVE or REJECT.",
        }),
        rejectionReason: z.string().min(5).optional(),
    }),
});

export const propertyValidations = {
    createPropertyZodSchema,
    updatePropertyZodSchema,
    updateAvailabilityStatusZodSchema,
    approveOrRejectPropertyZodSchema,
};
