import mongoose, { Schema } from "mongoose";
import crypto from "crypto";
import { IStay, StayType, RoomType, PriceUnit, ListingStatus, AvailabilityStatus, WeekDay, BookingDurationUnit, CancellationPolicy, ITimeRange, IWeeklySchedule, IBookingDuration, IStayHighlight, IBookingRules } from "./stay.interface";

// Sub-schema: Time Range
const TimeRangeSchema = new Schema<ITimeRange>(
    {
        startTime: { type: String, required: true, trim: true },
        endTime: { type: String, required: true, trim: true },
    },
    { _id: false },
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
    { _id: false },
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
    { _id: false },
);

// Sub-schema: Stay Highlight
const StayHighlightSchema = new Schema<IStayHighlight>(
    {
        title: { type: String, required: true, trim: true },
        description: { type: String, required: true, trim: true },
    },
    { _id: false },
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
            default: CancellationPolicy.FLEXIBLE,
        },
        allowSameDayBooking: { type: Boolean, default: true },
        minimumAdvancePayment: { type: Number, default: 0 },
    },
    { _id: false },
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
    { _id: false },
);

// Main Stay Schema
const StaySchema = new Schema<IStay>(
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
        stayType: {
            type: String,
            enum: Object.values(StayType),
            required: [true, "Stay type is required."],
        },
        roomType: {
            type: String,
            enum: Object.values(RoomType),
            required: [true, "Room type is required."],
        },
        title: {
            type: String,
            required: [true, "Stay title is required."],
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
            required: [true, "Stay description is required."],
            trim: true,
        },
        highlights: {
            type: [StayHighlightSchema],
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
            required: [true, "Stay price per unit is required."],
            min: [0, "Price cannot be negative."],
        },
        originalPrice: {
            type: Number,
            min: [0, "Original price cannot be negative."],
        },
        priceUnit: {
            type: String,
            enum: Object.values(PriceUnit),
            default: PriceUnit.PER_NIGHT,
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

        // Stay-specific attributes
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
    },
);

StaySchema.pre("validate", async function () {
    if (!this.propertyNumber) {
        let isUnique = false;
        let generatedNumber = "";

        while (!isUnique) {
            generatedNumber = crypto.randomInt(1000000, 10000000).toString();
            const existing = await mongoose.models.Stay?.findOne({ propertyNumber: generatedNumber });
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
        this.slug = `${baseSlug || "stay"}-${randomSuffix}`;
    }

    if (!this.featuredImage && this.images && this.images.length > 0) {
        this.featuredImage = this.images[0];
    }
});

StaySchema.index({ "location.geo": "2dsphere" });
StaySchema.index({ slug: 1 }, { unique: true });
StaySchema.index({ propertyNumber: 1 }, { unique: true, sparse: true });

StaySchema.index({ status: 1, isDeleted: 1, isFeatured: -1, createdAt: -1 });
StaySchema.index({ stayType: 1, roomType: 1, status: 1, isDeleted: 1 });
StaySchema.index({ status: 1, isDeleted: 1, price: 1 });
StaySchema.index({ "location.city": 1, status: 1, isDeleted: 1 });
StaySchema.index({ "location.city": 1, "location.area": 1 });
StaySchema.index({ status: 1, availabilityStatus: 1, isDeleted: 1 });
StaySchema.index({ isVerified: 1, status: 1, isDeleted: 1 });
StaySchema.index({ status: 1, isDeleted: 1, ratingAverage: -1 });
StaySchema.index({ createdBy: 1, isDeleted: 1 });
StaySchema.index({ owner: 1, isDeleted: 1 });

StaySchema.index({
    title: "text",
    description: "text",
    "location.address": "text",
    "location.area": "text",
    "location.city": "text",
});

export const StayModel = mongoose.model<IStay>("Stay", StaySchema, "stays");
