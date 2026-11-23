import mongoose, { Schema } from "mongoose";
import crypto from "crypto";
import {
    ITurf,
    SportType,
    TurfSize,
    SurfaceType,
    PriceUnit,
    ListingStatus,
    AvailabilityStatus,
    WeekDay,
    ITimeRange,
    IWeeklySchedule,
    ITurfHighlight,
    IBookingRules,
} from "./turf.interface";

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

// Sub-schema: Turf Highlight
const TurfHighlightSchema = new Schema<ITurfHighlight>(
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
        allowSameDayBooking: { type: Boolean, default: true },
        minimumAdvancePayment: { type: Number, default: 0 },
    },
    { _id: false }
);

// Sub-schema: Location with 2dsphere GeoJSON
const LocationSchema = new Schema(
    {
        address: { type: String, required: [true, "Street address is required."], trim: true },
        area: { type: String, required: [true, "Neighborhood or area is required."], trim: true },
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
                default: [90.4125, 23.8103],
            },
        },
    },
    { _id: false }
);

// Main Turf Schema
const TurfSchema = new Schema<ITurf>(
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
        sportType: {
            type: String,
            enum: Object.values(SportType),
            required: [true, "Sport type is required."],
        },
        turfSize: {
            type: String,
            enum: Object.values(TurfSize),
            required: [true, "Turf size is required."],
        },
        surfaceType: {
            type: String,
            enum: Object.values(SurfaceType),
            required: [true, "Surface type is required."],
        },
        title: {
            type: String,
            required: [true, "Turf title is required."],
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
            required: [true, "Turf description is required."],
            trim: true,
        },
        highlights: {
            type: [TurfHighlightSchema],
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
            required: [true, "Hourly turf rate is required."],
            min: [0, "Price cannot be negative."],
        },
        originalPrice: {
            type: Number,
            min: [0, "Original price cannot be negative."],
        },
        priceUnit: {
            type: String,
            enum: Object.values(PriceUnit),
            default: PriceUnit.PER_HOUR,
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
            required: [true, "Location details are required."],
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

        // Turf-specific attributes
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

        // Moderation & status
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

TurfSchema.pre("validate", async function () {
    if (!this.propertyNumber) {
        let isUnique = false;
        let generatedNumber = "";

        while (!isUnique) {
            generatedNumber = crypto.randomInt(1000000, 10000000).toString();
            const existing = await mongoose.models.Turf?.findOne({ propertyNumber: generatedNumber });
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
            .replace(/[^\w\s-]/g, "")
            .replace(/[\s_-]+/g, "-")
            .replace(/^-+|-+$/g, "");

        const randomSuffix = crypto.randomBytes(3).toString("hex");
        this.slug = `${baseSlug || "turf"}-${randomSuffix}`;
    }

    if (!this.featuredImage && this.images && this.images.length > 0) {
        this.featuredImage = this.images[0];
    }
});

TurfSchema.index({ "location.geo": "2dsphere" });
TurfSchema.index({ slug: 1 }, { unique: true });
TurfSchema.index({ propertyNumber: 1 }, { unique: true, sparse: true });

TurfSchema.index({ status: 1, isDeleted: 1, isFeatured: -1, createdAt: -1 });
TurfSchema.index({ sportType: 1, turfSize: 1, status: 1, isDeleted: 1 });
TurfSchema.index({ status: 1, isDeleted: 1, price: 1 });
TurfSchema.index({ "location.city": 1, status: 1, isDeleted: 1 });
TurfSchema.index({ "location.city": 1, "location.area": 1 });
TurfSchema.index({ status: 1, availabilityStatus: 1, isDeleted: 1 });
TurfSchema.index({ isVerified: 1, status: 1, isDeleted: 1 });
TurfSchema.index({ status: 1, isDeleted: 1, ratingAverage: -1 });
TurfSchema.index({ createdBy: 1, isDeleted: 1 });
TurfSchema.index({ owner: 1, isDeleted: 1 });

TurfSchema.index({
    title: "text",
    description: "text",
    "location.address": "text",
    "location.area": "text",
    "location.city": "text",
});

export const TurfModel = mongoose.model<ITurf>("Turf", TurfSchema, "turfs");

