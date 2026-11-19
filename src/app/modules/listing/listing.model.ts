import mongoose, { Schema } from "mongoose";
import crypto from "crypto";
import {
    IListing,
    ListingCategory,
    ListingSubCategory,
    PriceUnit,
    ListingStatus,
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
    ITimeRange,
    IWeeklySchedule,
    IBookingDuration,
    IListingHighlight,
    IBookingRules,
    IHomeDetails,
    IStayDetails,
    ITurfDetails,
    IPropertyDetails,
} from "./listing.interface";

// Sub-schema: Time Range
const TimeRangeSchema = new Schema<ITimeRange>(
    {
        startTime: { type: String, required: true, trim: true },
        endTime: { type: String, required: true, trim: true },
    },
    { _id: false }
);

// Sub-schema: Weekly Schedule
const WeeklyScheduleSchema = new Schema<IWeeklySchedule>(
    {
        day: {
            type: String,
            enum: Object.values(WeekDay),
            required: true,
        },
        isOpen: {
            type: Boolean,
            default: true,
        },
        timeSlots: {
            type: [TimeRangeSchema],
            default: [],
        },
    },
    { _id: false }
);

// Sub-schema: Booking Duration
const BookingDurationSchema = new Schema<IBookingDuration>(
    {
        value: { type: Number, required: true, min: 1 },
        unit: {
            type: String,
            enum: Object.values(BookingDurationUnit),
            required: true,
        },
    },
    { _id: false }
);

// Sub-schema: Listing Highlight
const ListingHighlightSchema = new Schema<IListingHighlight>(
    {
        title: { type: String, required: true, trim: true },
        description: { type: String, required: true, trim: true },
    },
    { _id: false }
);

// Sub-schema: Booking Rules
const BookingRulesSchema = new Schema<IBookingRules>(
    {
        requiresApproval: { type: Boolean, default: false },
        advanceBookingHours: { type: Number, default: 0 },
        cancellationWindowHours: { type: Number, default: 24 },
        cancellationPolicy: {
            type: String,
            enum: Object.values(CancellationPolicy),
            default: CancellationPolicy.MODERATE,
        },
        allowSameDayBooking: { type: Boolean, default: true },
        minimumAdvancePayment: { type: Number, default: 0 },
    },
    { _id: false }
);

// Sub-schema: Home Details
const HomeDetailsSchema = new Schema<IHomeDetails>(
    {
        isOwner: { type: Boolean, default: true },
        targetTenant: {
            type: String,
            enum: Object.values(TargetTenant),
            default: TargetTenant.ANY,
        },
        rentType: {
            type: String,
            enum: Object.values(RentType),
            default: RentType.FULL_FLAT,
        },
        bedrooms: { type: Number, min: 0 },
        bathrooms: { type: Number, min: 0 },
        balconies: { type: Number, min: 0 },
        floorLevel: { type: Number },
        totalFloors: { type: Number },
        isFurnished: { type: Boolean, default: false },
        attachedBath: { type: Boolean, default: false },
        mealSystemAvailable: { type: Boolean, default: false },
        parkingSpaces: { type: Number, default: 0 },
        minimumLeaseMonths: { type: Number, default: 1 },
        availableFrom: { type: Date, default: Date.now },
        viewingAvailable: { type: Boolean, default: true },
        viewingSchedule: { type: [WeeklyScheduleSchema], default: [] },
    },
    { _id: false }
);

// Sub-schema: Stay Details
const StayDetailsSchema = new Schema<IStayDetails>(
    {
        stayType: {
            type: String,
            enum: Object.values(StayType),
            default: StayType.HOTEL,
        },
        roomType: {
            type: String,
            enum: Object.values(RoomType),
            default: RoomType.SINGLE,
        },
        maxGuests: { type: Number, default: 2, min: 1 },
        bedCount: { type: Number, default: 1, min: 1 },
        checkInTime: { type: String, default: "14:00" },
        checkOutTime: { type: String, default: "11:00" },
        receptionAvailable24Hours: { type: Boolean, default: true },
        freeBreakfast: { type: Boolean, default: false },
        childrenAllowed: { type: Boolean, default: true },
        petsAllowed: { type: Boolean, default: false },
        extraGuestPrice: { type: Number, default: 0 },
        minimumStay: BookingDurationSchema,
        maximumStay: BookingDurationSchema,
        operatingSchedule: { type: [WeeklyScheduleSchema], default: [] },
        cancellationPolicy: {
            type: String,
            enum: Object.values(CancellationPolicy),
            default: CancellationPolicy.FLEXIBLE,
        },
    },
    { _id: false }
);

// Sub-schema: Turf Details
const TurfDetailsSchema = new Schema<ITurfDetails>(
    {
        sportType: {
            type: String,
            enum: Object.values(SportType),
            default: SportType.FOOTBALL,
        },
        turfSize: {
            type: String,
            enum: Object.values(TurfSize),
            default: TurfSize.SEVEN_A_SIDE,
        },
        surfaceType: {
            type: String,
            enum: Object.values(SurfaceType),
            default: SurfaceType.ARTIFICIAL_GRASS,
        },
        hasFloodlights: { type: Boolean, default: true },
        slotDurationMinutes: { type: Number, default: 60, min: 15 },
        minimumBookingMinutes: { type: Number, default: 60, min: 15 },
        maximumBookingMinutes: { type: Number },
        bufferMinutes: { type: Number, default: 0 },
        operatingSchedule: { type: [WeeklyScheduleSchema], default: [] },
        equipmentRentalAvailable: { type: Boolean, default: false },
        equipmentIncluded: { type: Boolean, default: false },
        capacity: { type: Number, min: 1 },
        changingRoomAvailable: { type: Boolean, default: false },
        showerAvailable: { type: Boolean, default: false },
        parkingAvailable: { type: Boolean, default: false },
    },
    { _id: false }
);

// Sub-schema: Property Details
const PropertyDetailsSchema = new Schema<IPropertyDetails>(
    {
        propertyType: {
            type: String,
            enum: Object.values(PropertyType),
            default: PropertyType.APARTMENT,
        },
        ownershipType: {
            type: String,
            enum: Object.values(OwnershipType),
            default: OwnershipType.FREEHOLD,
        },
        landAreaSqFt: { type: Number, min: 0 },
        flatSizeSqFt: { type: Number, min: 0 },
        bedrooms: { type: Number, min: 0 },
        bathrooms: { type: Number, min: 0 },
        balconies: { type: Number, min: 0 },
        parkingSpaces: { type: Number, default: 0 },
        facingDirection: { type: String, trim: true },
        roadWidth: { type: Number, min: 0 },
        completionStatus: {
            type: String,
            enum: Object.values(CompletionStatus),
            default: CompletionStatus.READY,
        },
        handoverDate: { type: Date },
        registeredDeedReady: { type: Boolean, default: true },
        developerName: { type: String, trim: true },
    },
    { _id: false }
);

// Sub-schema: Location with 2dsphere GeoJSON
const LocationSchema = new Schema(
    {
        address: { type: String, required: [true, "Listing street address is required."], trim: true },
        area: { type: String, required: [true, "Listing neighborhood or area is required."], trim: true },
        city: { type: String, required: [true, "City is required."], trim: true },
        state: { type: String, trim: true },
        zipCode: { type: String, trim: true },
        country: { type: String, default: "Bangladesh", trim: true },
        geo: {
            type: {
                type: String,
                enum: ["Point"],
                default: "Point",
            },
            coordinates: {
                type: [Number], // [longitude, latitude]
                required: [true, "Geographic coordinates [lng, lat] are required."],
                default: [90.4125, 23.8103], // Default: Dhaka center
            },
        },
    },
    { _id: false }
);

// Main Listing Schema
const ListingSchema = new Schema<IListing>(
    {
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: [true, "Created by user ID is required."],
        },
        owner: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
        category: {
            type: String,
            enum: {
                values: Object.values(ListingCategory),
                message: "Category '{VALUE}' is invalid. Choose HOME, STAY, TURF, or PROPERTY.",
            },
            required: [true, "Listing category is required."],
        },
        subCategory: {
            type: String,
            enum: {
                values: Object.values(ListingSubCategory),
                message: "SubCategory '{VALUE}' is invalid.",
            },
            required: [true, "Listing subCategory is required."],
        },
        title: {
            type: String,
            required: [true, "Listing title is required."],
            trim: true,
            maxlength: [200, "Title cannot exceed 200 characters."],
        },
        slug: {
            type: String,
            trim: true,
            lowercase: true,
        },
        propertyNumber: {
            type: String,
            trim: true,
        },
        description: {
            type: String,
            required: [true, "Listing description is required."],
            trim: true,
        },
        highlights: {
            type: [ListingHighlightSchema],
            default: [],
        },
        images: {
            type: [String],
            default: [],
        },
        featuredImage: {
            type: String,
            trim: true,
        },
        videoUrl: {
            type: String,
            trim: true,
        },
        virtualTourUrl: {
            type: String,
            trim: true,
        },
        price: {
            type: Number,
            required: [true, "Listing price is required."],
            min: [0, "Price cannot be negative."],
        },
        originalPrice: {
            type: Number,
            min: [0, "Original price cannot be negative."],
        },
        priceUnit: {
            type: String,
            enum: Object.values(PriceUnit),
            required: [true, "Price unit is required (PER_MONTH, PER_NIGHT, PER_HOUR, PER_DAY, TOTAL)."],
        },
        currency: {
            type: String,
            default: "BDT",
            uppercase: true,
            trim: true,
        },
        securityDeposit: {
            type: Number,
            default: 0,
            min: 0,
        },
        isNegotiable: {
            type: Boolean,
            default: false,
        },
        location: {
            type: LocationSchema,
            required: [true, "Listing location details are required."],
        },
        contactPhone: {
            type: String,
            required: [true, "Contact phone number is required."],
            trim: true,
        },
        contactEmail: {
            type: String,
            lowercase: true,
            trim: true,
        },
        amenities: {
            type: [String],
            default: [],
        },
        rules: {
            type: [String],
            default: [],
        },
        nearbyPlaces: {
            type: [String],
            default: [],
        },
        bookingEnabled: {
            type: Boolean,
            default: true,
        },
        bookingRules: BookingRulesSchema,
        minimumBookingDuration: BookingDurationSchema,
        maximumBookingDuration: BookingDurationSchema,

        // Vertical Specific Details
        homeDetails: HomeDetailsSchema,
        stayDetails: StayDetailsSchema,
        turfDetails: TurfDetailsSchema,
        propertyDetails: PropertyDetailsSchema,

        // Status & Moderation
        status: {
            type: String,
            enum: Object.values(ListingStatus),
            default: ListingStatus.PENDING_APPROVAL,
        },
        availabilityStatus: {
            type: String,
            enum: Object.values(AvailabilityStatus),
            default: AvailabilityStatus.AVAILABLE,
        },
        isVerified: {
            type: Boolean,
            default: false,
        },
        isFeatured: {
            type: Boolean,
            default: false,
        },
        viewsCount: {
            type: Number,
            default: 0,
            min: 0,
        },
        favoritesCount: {
            type: Number,
            default: 0,
            min: 0,
        },
        bookmarksCount: {
            type: Number,
            default: 0,
            min: 0,
        },
        ratingAverage: {
            type: Number,
            default: 0,
            min: 0,
            max: 5,
        },
        totalReviews: {
            type: Number,
            default: 0,
            min: 0,
        },
        approvedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
        approvedAt: {
            type: Date,
        },
        rejectionReason: {
            type: String,
            trim: true,
        },
        publishedAt: {
            type: Date,
        },
        expiresAt: {
            type: Date,
        },
        isDeleted: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

// Property number, slug generator & featured image helper
ListingSchema.pre("validate", async function () {
    // Generate unique random property number if not provided
    if (!this.propertyNumber) {
        let isUnique = false;
        let generatedNumber = "";

        while (!isUnique) {
            // Generate a 7-digit random number (1000000 - 9999999)
            generatedNumber = crypto.randomInt(1000000, 10000000).toString();

            const existing = await mongoose.models.Listing?.findOne({ propertyNumber: generatedNumber });
            if (!existing) {
                isUnique = true;
            }
        }

        this.propertyNumber = generatedNumber;
    }

    if (this.title && (!this.slug || this.isModified("title"))) {
        const baseSlug = this.title
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, "") // Remove special characters
            .replace(/[\s_-]+/g, "-") // Collapse whitespace and underscores to hyphens
            .replace(/^-+|-+$/g, ""); // Trim leading/trailing hyphens

        const randomSuffix = crypto.randomBytes(3).toString("hex");
        this.slug = `${baseSlug || "listing"}-${randomSuffix}`;
    }

    // Default featuredImage to first image in images array if not provided
    if (!this.featuredImage && this.images && this.images.length > 0) {
        this.featuredImage = this.images[0];
    }
});

// Indexes for High Performance Queries
ListingSchema.index({ "location.geo": "2dsphere" });
ListingSchema.index({ slug: 1 }, { unique: true });
ListingSchema.index({ propertyNumber: 1 }, { unique: true, sparse: true });

// Core marketplace query indexes (Equality, Sort, Range)
ListingSchema.index({ category: 1, status: 1, isDeleted: 1, isFeatured: -1, createdAt: -1 });
ListingSchema.index({ category: 1, subCategory: 1, status: 1, isDeleted: 1 });
ListingSchema.index({ category: 1, status: 1, isDeleted: 1, price: 1 });
ListingSchema.index({ "location.city": 1, category: 1, status: 1, isDeleted: 1 });
ListingSchema.index({ "location.city": 1, "location.area": 1 });
ListingSchema.index({ status: 1, isDeleted: 1, createdAt: -1 });
ListingSchema.index({ status: 1, availabilityStatus: 1, isDeleted: 1 });
ListingSchema.index({ isFeatured: 1, status: 1, isDeleted: 1, createdAt: -1 });
ListingSchema.index({ isVerified: 1, status: 1, isDeleted: 1 });
ListingSchema.index({ category: 1, status: 1, isDeleted: 1, ratingAverage: -1 });
ListingSchema.index({ createdBy: 1, isDeleted: 1 });
ListingSchema.index({ owner: 1, isDeleted: 1 });

// Vertical specific compound indexes
ListingSchema.index({ category: 1, "homeDetails.rentType": 1, "homeDetails.targetTenant": 1, status: 1, isDeleted: 1 });
ListingSchema.index({ category: 1, "stayDetails.stayType": 1, "stayDetails.roomType": 1, status: 1, isDeleted: 1 });
ListingSchema.index({ category: 1, "turfDetails.sportType": 1, "turfDetails.turfSize": 1, status: 1, isDeleted: 1 });
ListingSchema.index({ category: 1, "propertyDetails.propertyType": 1, "propertyDetails.completionStatus": 1, status: 1, isDeleted: 1 });

// Full-text search index for keyword searching
ListingSchema.index({
    title: "text",
    description: "text",
    "location.address": "text",
    "location.area": "text",
    "location.city": "text",
});

export const ListingModel = mongoose.model<IListing>("Listing", ListingSchema);

