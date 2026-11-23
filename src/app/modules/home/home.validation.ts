import { z } from "zod";
import {
    HomeSubCategory,
    TargetTenant,
    RentType,
    PriceUnit,
    AvailabilityStatus,
    WeekDay,
    CancellationPolicy,
} from "./home.interface";

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

const timeRangeValidationSchema = z.object({
    startTime: z.string({ message: "Start time is required." }),
    endTime: z.string({ message: "End time is required." }),
});

const weeklyScheduleValidationSchema = z.object({
    day: z.nativeEnum(WeekDay),
    isOpen: z.boolean().default(true),
    timeSlots: z.array(timeRangeValidationSchema).default([]),
});

const homeHighlightValidationSchema = z.object({
    title: z.string().min(1, "Highlight title is required."),
    description: z.string().min(1, "Highlight description is required."),
});

const bookingRulesValidationSchema = z.object({
    requiresApproval: z.boolean().optional(),
    advanceBookingHours: z.number().min(0).optional(),
    cancellationWindowHours: z.number().min(0).optional(),
    cancellationPolicy: z.nativeEnum(CancellationPolicy).optional(),
    allowSameDayBooking: z.boolean().optional(),
    minimumAdvancePayment: z.number().min(0).optional(),
});

const createHomeZodSchema = z.object({
    body: z.object({
        owner: z.string().optional(),
        subCategory: z.nativeEnum(HomeSubCategory, { message: "Invalid home subCategory." }),
        title: z.string({ message: "Title is required." }).min(5).max(200),
        description: z.string({ message: "Description is required." }).min(10),
        highlights: z.array(homeHighlightValidationSchema).optional(),
        images: z.array(z.string()).default([]),
        featuredImage: z.string().optional(),
        videoUrl: z.string().url().optional().or(z.literal("")),
        virtualTourUrl: z.string().url().optional().or(z.literal("")),
        price: z.number({ message: "Price is required." }).min(0),
        originalPrice: z.number().min(0).optional(),
        priceUnit: z.nativeEnum(PriceUnit).default(PriceUnit.PER_MONTH),
        currency: z.string().default("BDT"),
        securityDeposit: z.number().min(0).optional(),
        isNegotiable: z.boolean().optional(),
        location: locationValidationSchema,
        contactPhone: z.string({ message: "Contact phone is required." }).min(11),
        contactEmail: z.string().email().optional().or(z.literal("")),
        amenities: z.array(z.string()).default([]),
        rules: z.array(z.string()).optional(),
        nearbyPlaces: z.array(z.string()).optional(),
        bookingEnabled: z.boolean().default(true),
        bookingRules: bookingRulesValidationSchema.optional(),

        // Home-specific attributes (supports top-level or nested homeDetails)
        isOwner: z.boolean().default(true),
        targetTenant: z.nativeEnum(TargetTenant).default(TargetTenant.ANY),
        rentType: z.nativeEnum(RentType).default(RentType.FULL_FLAT),
        bedrooms: z.number().min(0).optional(),
        bathrooms: z.number().min(0).optional(),
        balconies: z.number().min(0).optional(),
        floorLevel: z.number().optional(),
        totalFloors: z.number().optional(),
        isFurnished: z.boolean().optional(),
        attachedBath: z.boolean().optional(),
        mealSystemAvailable: z.boolean().optional(),
        parkingSpaces: z.number().min(0).optional(),
        minimumLeaseMonths: z.number().min(1).optional(),
        availableFrom: z.union([z.string(), z.date()]).optional(),
        viewingAvailable: z.boolean().optional(),
        viewingSchedule: z.array(weeklyScheduleValidationSchema).optional(),
        homeDetails: z.record(z.string(), z.any()).optional(),
    }),
});

const updateHomeZodSchema = z.object({
    body: z.object({
        owner: z.string().optional(),
        subCategory: z.nativeEnum(HomeSubCategory).optional(),
        title: z.string().min(5).max(200).optional(),
        description: z.string().min(10).optional(),
        highlights: z.array(homeHighlightValidationSchema).optional(),
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

        isOwner: z.boolean().optional(),
        targetTenant: z.nativeEnum(TargetTenant).optional(),
        rentType: z.nativeEnum(RentType).optional(),
        bedrooms: z.number().min(0).optional(),
        bathrooms: z.number().min(0).optional(),
        balconies: z.number().min(0).optional(),
        floorLevel: z.number().optional(),
        totalFloors: z.number().optional(),
        isFurnished: z.boolean().optional(),
        attachedBath: z.boolean().optional(),
        mealSystemAvailable: z.boolean().optional(),
        parkingSpaces: z.number().min(0).optional(),
        minimumLeaseMonths: z.number().min(1).optional(),
        availableFrom: z.union([z.string(), z.date()]).optional(),
        viewingAvailable: z.boolean().optional(),
        viewingSchedule: z.array(weeklyScheduleValidationSchema).optional(),
        homeDetails: z.record(z.string(), z.any()).optional(),
    }),
});

const updateAvailabilityStatusZodSchema = z.object({
    body: z.object({
        availabilityStatus: z.nativeEnum(AvailabilityStatus, {
            message: "Invalid availability status. Must be AVAILABLE, BOOKED, or RENTED.",
        }),
    }),
});

const approveOrRejectHomeZodSchema = z.object({
    body: z.object({
        action: z.enum(["APPROVE", "REJECT"], {
            message: "Action must be either APPROVE or REJECT.",
        }),
        rejectionReason: z.string().min(5).optional(),
    }),
});

export const homeValidations = {
    createHomeZodSchema,
    updateHomeZodSchema,
    updateAvailabilityStatusZodSchema,
    approveOrRejectHomeZodSchema,
};
