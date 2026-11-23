import { Types } from "mongoose";

export enum PropertyType {
    APARTMENT = "APARTMENT",
    DUPLEX = "DUPLEX",
    BUILDING = "BUILDING",
    RESIDENTIAL_PLOT = "RESIDENTIAL_PLOT",
    COMMERCIAL_SPACE = "COMMERCIAL_SPACE",
}

export enum OwnershipType {
    FREEHOLD = "FREEHOLD",
    LEASEHOLD = "LEASEHOLD",
}

export enum CompletionStatus {
    READY = "READY",
    UNDER_CONSTRUCTION = "UNDER_CONSTRUCTION",
    UPCOMING = "UPCOMING",
}

export enum PriceUnit {
    TOTAL = "TOTAL",
    PER_MONTH = "PER_MONTH",
}

export enum ListingStatus {
    DRAFT = "DRAFT",
    PENDING_APPROVAL = "PENDING_APPROVAL",
    ACTIVE = "ACTIVE",
    REJECTED = "REJECTED",
    INACTIVE = "INACTIVE",
}

export enum AvailabilityStatus {
    AVAILABLE = "AVAILABLE",
    BOOKED = "BOOKED",
    SOLD = "SOLD",
}

export interface IPropertyHighlight {
    title: string;
    description: string;
}

export interface IBookingRules {
    requiresApproval?: boolean;
    advanceBookingHours?: number;
    allowSameDayBooking?: boolean;
    minimumAdvancePayment?: number;
}

export interface IProperty {
    _id?: Types.ObjectId;
    createdBy: Types.ObjectId;
    owner?: Types.ObjectId;

    propertyType: PropertyType;
    ownershipType: OwnershipType;

    title: string;
    slug: string;
    propertyNumber: string;
    description: string;

    highlights?: IPropertyHighlight[];
    images: string[];
    featuredImage?: string;
    videoUrl?: string;
    virtualTourUrl?: string;

    price: number;
    originalPrice?: number;
    priceUnit: PriceUnit;
    currency: string;
    securityDeposit?: number;
    isNegotiable?: boolean;

    location: {
        address: string;
        area: string;
        city: string;
        state?: string;
        zipCode?: string;
        country: string;
        geo: {
            type: "Point";
            coordinates: [number, number]; // [longitude, latitude]
        };
    };

    contactPhone: string;
    contactEmail?: string;

    amenities: string[];
    rules?: string[];
    nearbyPlaces?: string[];

    bookingEnabled: boolean;
    bookingRules?: IBookingRules;

    // Property-specific attributes
    landAreaSqFt?: number;
    flatSizeSqFt?: number;
    bedrooms?: number;
    bathrooms?: number;
    balconies?: number;
    parkingSpaces?: number;
    facingDirection?: string;
    roadWidth?: number;
    completionStatus: CompletionStatus;
    handoverDate?: Date;
    registeredDeedReady: boolean;
    developerName?: string;

    // Moderation & status
    status: ListingStatus;
    availabilityStatus: AvailabilityStatus;
    isVerified: boolean;
    isFeatured: boolean;
    isFavorite?: boolean;

    viewsCount: number;
    favoritesCount: number;
    bookmarksCount?: number;
    ratingAverage: number;
    totalReviews: number;

    approvedBy?: Types.ObjectId;
    approvedAt?: Date;
    rejectionReason?: string;

    publishedAt?: Date;
    expiresAt?: Date;
    isDeleted: boolean;

    createdAt?: Date;
    updatedAt?: Date;
}

