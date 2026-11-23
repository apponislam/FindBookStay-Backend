import mongoose, { Schema } from "mongoose";
import crypto from "crypto";
import {
    IProperty,
    PropertyType,
    OwnershipType,
    CompletionStatus,
    PriceUnit,
    ListingStatus,
    AvailabilityStatus,
    IPropertyHighlight,
    IBookingRules,
} from "./property.interface";

// Sub-schema: Property Highlight
const PropertyHighlightSchema = new Schema<IPropertyHighlight>(
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

// Main Property Schema
const PropertySchema = new Schema<IProperty>(
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
        propertyType: {
            type: String,
            enum: Object.values(PropertyType),
            required: [true, "Property type is required."],
        },
        ownershipType: {
            type: String,
            enum: Object.values(OwnershipType),
            default: OwnershipType.FREEHOLD,
        },
        title: {
            type: String,
            required: [true, "Property title is required."],
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
            required: [true, "Property description is required."],
            trim: true,
        },
        highlights: {
            type: [PropertyHighlightSchema],
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
            required: [true, "Property valuation / price is required."],
            min: [0, "Price cannot be negative."],
        },
        originalPrice: {
            type: Number,
            min: [0, "Original price cannot be negative."],
        },
        priceUnit: {
            type: String,
            enum: Object.values(PriceUnit),
            default: PriceUnit.TOTAL,
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
            default: false,
        },
        bookingRules: BookingRulesSchema,

        // Property-specific attributes
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

PropertySchema.pre("validate", async function () {
    if (!this.propertyNumber) {
        let isUnique = false;
        let generatedNumber = "";

        while (!isUnique) {
            generatedNumber = crypto.randomInt(1000000, 10000000).toString();
            const existing = await mongoose.models.Property?.findOne({ propertyNumber: generatedNumber });
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
        this.slug = `${baseSlug || "property"}-${randomSuffix}`;
    }

    if (!this.featuredImage && this.images && this.images.length > 0) {
        this.featuredImage = this.images[0];
    }
});

PropertySchema.index({ "location.geo": "2dsphere" });
PropertySchema.index({ slug: 1 }, { unique: true });
PropertySchema.index({ propertyNumber: 1 }, { unique: true, sparse: true });

PropertySchema.index({ status: 1, isDeleted: 1, isFeatured: -1, createdAt: -1 });
PropertySchema.index({ propertyType: 1, completionStatus: 1, status: 1, isDeleted: 1 });
PropertySchema.index({ status: 1, isDeleted: 1, price: 1 });
PropertySchema.index({ "location.city": 1, status: 1, isDeleted: 1 });
PropertySchema.index({ "location.city": 1, "location.area": 1 });
PropertySchema.index({ status: 1, availabilityStatus: 1, isDeleted: 1 });
PropertySchema.index({ isVerified: 1, status: 1, isDeleted: 1 });
PropertySchema.index({ status: 1, isDeleted: 1, ratingAverage: -1 });
PropertySchema.index({ createdBy: 1, isDeleted: 1 });
PropertySchema.index({ owner: 1, isDeleted: 1 });

PropertySchema.index({
    title: "text",
    description: "text",
    "location.address": "text",
    "location.area": "text",
    "location.city": "text",
});

export const PropertyModel = mongoose.model<IProperty>("Property", PropertySchema, "properties");

