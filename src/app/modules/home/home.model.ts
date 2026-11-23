import mongoose, { Schema } from "mongoose";
import crypto from "crypto";
import {
    IHome,
    HomeSubCategory,
    TargetTenant,
    RentType,
    PriceUnit,
    ListingStatus,
    AvailabilityStatus,
    WeekDay,
    CancellationPolicy,
    ITimeRange,
    IWeeklySchedule,
    IHomeHighlight,
    IBookingRules,
} from "./home.interface";

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

// Sub-schema: Home Highlight
const HomeHighlightSchema = new Schema<IHomeHighlight>(
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
                default: [90.4125, 23.8103], // Default: Dhaka center
            },
        },
    },
    { _id: false }
);

// Main Home Schema
const HomeSchema = new Schema<IHome>(
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
        subCategory: {
            type: String,
            enum: Object.values(HomeSubCategory),
            required: [true, "Home subCategory is required."],
        },
        title: {
            type: String,
            required: [true, "Home title is required."],
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
            required: [true, "Home description is required."],
            trim: true,
        },
        highlights: {
            type: [HomeHighlightSchema],
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
            required: [true, "Rental price is required."],
            min: [0, "Price cannot be negative."],
        },
        originalPrice: {
            type: Number,
            min: [0, "Original price cannot be negative."],
        },
        priceUnit: {
            type: String,
            enum: Object.values(PriceUnit),
            default: PriceUnit.PER_MONTH,
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

        // Home-specific attributes
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

// Property number, slug generator & featured image helper
HomeSchema.pre("validate", async function () {
    if (!this.propertyNumber) {
        let isUnique = false;
        let generatedNumber = "";

        while (!isUnique) {
            generatedNumber = crypto.randomInt(1000000, 10000000).toString();
            const existing = await mongoose.models.Home?.findOne({ propertyNumber: generatedNumber });
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
        this.slug = `${baseSlug || "home"}-${randomSuffix}`;
    }

    if (!this.featuredImage && this.images && this.images.length > 0) {
        this.featuredImage = this.images[0];
    }
});

// Indexes for High Performance Queries (Never duplicate single field indexes with compound indexes)
HomeSchema.index({ "location.geo": "2dsphere" });
HomeSchema.index({ slug: 1 }, { unique: true });
HomeSchema.index({ propertyNumber: 1 }, { unique: true, sparse: true });

HomeSchema.index({ status: 1, isDeleted: 1, isFeatured: -1, createdAt: -1 });
HomeSchema.index({ subCategory: 1, status: 1, isDeleted: 1 });
HomeSchema.index({ rentType: 1, targetTenant: 1, status: 1, isDeleted: 1 });
HomeSchema.index({ status: 1, isDeleted: 1, price: 1 });
HomeSchema.index({ "location.city": 1, status: 1, isDeleted: 1 });
HomeSchema.index({ "location.city": 1, "location.area": 1 });
HomeSchema.index({ status: 1, availabilityStatus: 1, isDeleted: 1 });
HomeSchema.index({ isVerified: 1, status: 1, isDeleted: 1 });
HomeSchema.index({ status: 1, isDeleted: 1, ratingAverage: -1 });
HomeSchema.index({ createdBy: 1, isDeleted: 1 });
HomeSchema.index({ owner: 1, isDeleted: 1 });

// Full-text search index
HomeSchema.index({
    title: "text",
    description: "text",
    "location.address": "text",
    "location.area": "text",
    "location.city": "text",
});

export const HomeModel = mongoose.model<IHome>("Home", HomeSchema, "homes");

