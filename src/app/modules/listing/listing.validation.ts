import { z } from "zod";
import {
    ListingCategory,
    ListingSubCategory,
    PriceUnit,
    AvailabilityStatus,
    TargetTenant,
    RentType,
    StayType,
    RoomType,
    CancellationPolicy,
    SportType,
    TurfSize,
    SurfaceType,
    PropertyType,
    OwnershipType,
    CompletionStatus,
    WeekDay,
    BookingDurationUnit,
} from "./listing.interface";

// Geo Coordinates Schema
const geoSchema = z.object({
    type: z.literal("Point").default("Point"),
    coordinates: z.tuple([z.number(), z.number()]).default([90.4125, 23.8103]),
});

// Location Schema
const locationValidationSchema = z.object({
    address: z.string({ message: "Address is required." }).min(2, "Address must be at least 2 characters."),
    area: z.string({ message: "Area is required." }).min(2, "Area must be at least 2 characters."),
    city: z.string({ message: "City is required." }).min(2, "City must be at least 2 characters."),
    state: z.string().optional(),
    zipCode: z.string().optional(),
    country: z.string().default("Bangladesh"),
    geo: geoSchema.optional(),
});

// Time Range Schema
const timeRangeValidationSchema = z.object({
    startTime: z.string({ message: "Start time is required." }),
    endTime: z.string({ message: "End time is required." }),
});

// Weekly Schedule Schema
const weeklyScheduleValidationSchema = z.object({
    day: z.nativeEnum(WeekDay),
    isOpen: z.boolean().default(true),
    timeSlots: z.array(timeRangeValidationSchema).default([]),
});

// Booking Duration Schema
const bookingDurationValidationSchema = z.object({
    value: z.number().min(1, "Value must be at least 1."),
    unit: z.nativeEnum(BookingDurationUnit),
});

// Highlight Schema
const listingHighlightValidationSchema = z.object({
    title: z.string().min(1, "Highlight title is required."),
    description: z.string().min(1, "Highlight description is required."),
});

// Booking Rules Schema
const bookingRulesValidationSchema = z.object({
    requiresApproval: z.boolean().optional(),
    advanceBookingHours: z.number().min(0).optional(),
    cancellationWindowHours: z.number().min(0).optional(),
    cancellationPolicy: z.nativeEnum(CancellationPolicy).optional(),
    allowSameDayBooking: z.boolean().optional(),
    minimumAdvancePayment: z.number().min(0).optional(),
});

// HOME Details Schema
const homeDetailsValidationSchema = z.object({
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
});

// STAY Details Schema
const stayDetailsValidationSchema = z.object({
    stayType: z.nativeEnum(StayType).default(StayType.HOTEL),
    roomType: z.nativeEnum(RoomType).default(RoomType.SINGLE),
    maxGuests: z.number().min(1).default(2),
    bedCount: z.number().min(1).default(1),
    checkInTime: z.string().default("14:00"),
    checkOutTime: z.string().default("11:00"),
    receptionAvailable24Hours: z.boolean().optional(),
    freeBreakfast: z.boolean().optional(),
    childrenAllowed: z.boolean().optional(),
    petsAllowed: z.boolean().optional(),
    extraGuestPrice: z.number().min(0).optional(),
    minimumStay: bookingDurationValidationSchema.optional(),
    maximumStay: bookingDurationValidationSchema.optional(),
    operatingSchedule: z.array(weeklyScheduleValidationSchema).optional(),
    cancellationPolicy: z.nativeEnum(CancellationPolicy).optional(),
});

// TURF Details Schema
const turfDetailsValidationSchema = z.object({
    sportType: z.nativeEnum(SportType).default(SportType.FOOTBALL),
    turfSize: z.nativeEnum(TurfSize).default(TurfSize.SEVEN_A_SIDE),
    surfaceType: z.nativeEnum(SurfaceType).default(SurfaceType.ARTIFICIAL_GRASS),
    hasFloodlights: z.boolean().default(true),
    slotDurationMinutes: z.number().min(15).default(60),
    minimumBookingMinutes: z.number().min(15).default(60),
    maximumBookingMinutes: z.number().optional(),
    bufferMinutes: z.number().min(0).optional(),
    operatingSchedule: z.array(weeklyScheduleValidationSchema).optional(),
    equipmentRentalAvailable: z.boolean().optional(),
    equipmentIncluded: z.boolean().optional(),
    capacity: z.number().min(1).optional(),
    changingRoomAvailable: z.boolean().optional(),
    showerAvailable: z.boolean().optional(),
    parkingAvailable: z.boolean().optional(),
});

// PROPERTY Details Schema
const propertyDetailsValidationSchema = z.object({
    propertyType: z.nativeEnum(PropertyType).default(PropertyType.APARTMENT),
    ownershipType: z.nativeEnum(OwnershipType).default(OwnershipType.FREEHOLD),
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
});

// Create Listing Validation Schema
const createListingZodSchema = z.object({
    category: z.nativeEnum(ListingCategory, {
        message: "Listing category (HOME, STAY, TURF, or PROPERTY) is required.",
    }),
    subCategory: z.nativeEnum(ListingSubCategory, {
        message: "Listing subcategory is required.",
    }),
    title: z
        .string({ message: "Listing title is required." })
        .min(3, "Title must be at least 3 characters.")
        .max(200, "Title cannot exceed 200 characters."),
    propertyNumber: z.string().optional(),
    description: z
        .string({ message: "Listing description is required." })
        .min(10, "Description must be at least 10 characters."),
    highlights: z.array(listingHighlightValidationSchema).optional(),
    images: z.array(z.string()).optional(),
    featuredImage: z.string().optional(),
    videoUrl: z.string().url("Video URL must be a valid link.").optional().or(z.literal("")),
    virtualTourUrl: z.string().url("Virtual tour URL must be a valid link.").optional().or(z.literal("")),
    price: z.number({ message: "Price is required." }).min(0, "Price cannot be negative."),
    originalPrice: z.number().min(0).optional(),
    priceUnit: z.nativeEnum(PriceUnit, {
        message: "Price unit is required (PER_MONTH, PER_NIGHT, PER_HOUR, PER_DAY, TOTAL).",
    }),
    currency: z.string().default("BDT"),
    securityDeposit: z.number().min(0).optional(),
    isNegotiable: z.boolean().optional(),
    location: locationValidationSchema,
    contactPhone: z
        .string({ message: "Contact phone number is required." })
        .min(7, "Phone number must be at least 7 characters."),
    contactEmail: z.string().email("Invalid email address.").optional().or(z.literal("")),
    amenities: z.array(z.string()).optional(),
    rules: z.array(z.string()).optional(),
    nearbyPlaces: z.array(z.string()).optional(),
    bookingEnabled: z.boolean().optional(),
    bookingRules: bookingRulesValidationSchema.optional(),
    minimumBookingDuration: bookingDurationValidationSchema.optional(),
    maximumBookingDuration: bookingDurationValidationSchema.optional(),

    // Specific Vertical Details
    homeDetails: homeDetailsValidationSchema.optional(),
    stayDetails: stayDetailsValidationSchema.optional(),
    turfDetails: turfDetailsValidationSchema.optional(),
    propertyDetails: propertyDetailsValidationSchema.optional(),
});

// Update Listing Validation Schema
const updateListingZodSchema = createListingZodSchema.partial();

// Approve or Reject Listing Validation Schema
const approveOrRejectListingZodSchema = z.object({
    status: z.enum(["ACTIVE", "REJECTED"], {
        message: "Status must be either ACTIVE or REJECTED.",
    }),
    rejectionReason: z.string().optional(),
});

// Update Availability Validation Schema
const updateAvailabilityStatusZodSchema = z.object({
    availabilityStatus: z.nativeEnum(AvailabilityStatus, {
        message: "Availability status (AVAILABLE, BOOKED, RENTED, SOLD) is required.",
    }),
});

export const listingValidations = {
    createListingZodSchema,
    updateListingZodSchema,
    approveOrRejectListingZodSchema,
    updateAvailabilityStatusZodSchema,
};
