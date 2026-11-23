import { Types } from "mongoose";

export enum StayType {
    HOTEL = "HOTEL",
    RESORT = "RESORT",
    GUEST_HOUSE = "GUEST_HOUSE",
    HOLIDAY_HOME = "HOLIDAY_HOME",
    SERVICED_APARTMENT = "SERVICED_APARTMENT",
}

export enum RoomType {
    SINGLE = "SINGLE",
    DOUBLE = "DOUBLE",
    SUITE = "SUITE",
    DELUXE = "DELUXE",
    VILLA = "VILLA",
}

export enum PriceUnit {
    PER_NIGHT = "PER_NIGHT",
    PER_DAY = "PER_DAY",
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

export enum BookingDurationUnit {
    MINUTE = "MINUTE",
    HOUR = "HOUR",
    NIGHT = "NIGHT",
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

export interface IBookingDuration {
    value: number;
    unit: BookingDurationUnit;
}

export interface IStayHighlight {
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

export interface IStay {
    _id?: Types.ObjectId;
    createdBy: Types.ObjectId;
    owner?: Types.ObjectId;

    stayType: StayType;
    roomType: RoomType;
    title: string;
    slug: string;
    propertyNumber: string;
    description: string;

    highlights?: IStayHighlight[];
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

    // Stay-specific attributes
    maxGuests: number;
    bedCount: number;
    checkInTime: string;
    checkOutTime: string;
    receptionAvailable24Hours?: boolean;
    freeBreakfast?: boolean;
    childrenAllowed?: boolean;
    petsAllowed?: boolean;
    extraGuestPrice?: number;
    minimumStay?: IBookingDuration;
    maximumStay?: IBookingDuration;
    operatingSchedule?: IWeeklySchedule[];
    cancellationPolicy?: CancellationPolicy;

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

