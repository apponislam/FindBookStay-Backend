import { Types } from "mongoose";

export enum HomeSubCategory {
    FAMILY_FLAT = "FAMILY_FLAT",
    BACHELOR_SEAT = "BACHELOR_SEAT",
    SINGLE_ROOM = "SINGLE_ROOM",
    SUBLET = "SUBLET",
}

export enum TargetTenant {
    FAMILY = "FAMILY",
    BACHELOR_MALE = "BACHELOR_MALE",
    BACHELOR_FEMALE = "BACHELOR_FEMALE",
    ANY = "ANY",
}

export enum RentType {
    FULL_FLAT = "FULL_FLAT",
    SINGLE_ROOM = "SINGLE_ROOM",
    BACHELOR_SEAT = "BACHELOR_SEAT",
    SUBLET = "SUBLET",
}

export enum PriceUnit {
    PER_MONTH = "PER_MONTH",
    PER_DAY = "PER_DAY",
    TOTAL = "TOTAL",
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
    RENTED = "RENTED",
}

export enum WeekDay {
    MONDAY = "MONDAY",
    TUESDAY = "TUESDAY",
    WEDNESDAY = "WEDNESDAY",
    THURSDAY = "THURSDAY",
    FRIDAY = "FRIDAY",
    SATURDAY = "SATURDAY",
    SUNDAY = "SUNDAY",
}

export enum CancellationPolicy {
    FLEXIBLE = "FLEXIBLE",
    MODERATE = "MODERATE",
    STRICT = "STRICT",
}

export interface ITimeRange {
    startTime: string;
    endTime: string;
}

export interface IWeeklySchedule {
    day: WeekDay;
    isOpen: boolean;
    timeSlots: ITimeRange[];
}

export interface IHomeHighlight {
    title: string;
    description: string;
}

export interface IBookingRules {
    requiresApproval?: boolean;
    advanceBookingHours?: number;
    cancellationWindowHours?: number;
    cancellationPolicy?: CancellationPolicy;
    allowSameDayBooking?: boolean;
    minimumAdvancePayment?: number;
}

export interface IHome {
    _id?: Types.ObjectId;
    createdBy: Types.ObjectId;
    owner?: Types.ObjectId;

    subCategory: HomeSubCategory;
    title: string;
    slug: string;
    propertyNumber: string;
    description: string;

    highlights?: IHomeHighlight[];
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

    // Home-specific attributes
    isOwner: boolean;
    targetTenant: TargetTenant;
    rentType: RentType;
    bedrooms?: number;
    bathrooms?: number;
    balconies?: number;
    floorLevel?: number;
    totalFloors?: number;
    isFurnished?: boolean;
    attachedBath?: boolean;
    mealSystemAvailable?: boolean;
    parkingSpaces?: number;
    minimumLeaseMonths?: number;
    availableFrom: Date;
    viewingAvailable?: boolean;
    viewingSchedule?: IWeeklySchedule[];

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

