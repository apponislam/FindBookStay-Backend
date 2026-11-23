import { Types } from "mongoose";

export enum SportType {
    FOOTBALL = "FOOTBALL",
    CRICKET = "CRICKET",
    BADMINTON = "BADMINTON",
    BASKETBALL = "BASKETBALL",
    MULTI_SPORT = "MULTI_SPORT",
}

export enum TurfSize {
    FIVE_A_SIDE = "5_A_SIDE",
    SEVEN_A_SIDE = "7_A_SIDE",
    ELEVEN_A_SIDE = "11_A_SIDE",
    FULL_GROUND = "FULL_GROUND",
    SINGLE_COURT = "SINGLE_COURT",
}

export enum SurfaceType {
    ARTIFICIAL_GRASS = "ARTIFICIAL_GRASS",
    NATURAL_GRASS = "NATURAL_GRASS",
    WOODEN = "WOODEN",
    SYNTHETIC = "SYNTHETIC",
    CLAY = "CLAY",
}

export enum PriceUnit {
    PER_HOUR = "PER_HOUR",
    PER_DAY = "PER_DAY",
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

export interface ITimeRange {
    startTime: string;
    endTime: string;
}

export interface IWeeklySchedule {
    day: WeekDay;
    isOpen: boolean;
    timeSlots: ITimeRange[];
}

export interface ITurfHighlight {
    title: string;
    description: string;
}

export interface IBookingRules {
    requiresApproval?: boolean;
    advanceBookingHours?: number;
    cancellationWindowHours?: number;
    allowSameDayBooking?: boolean;
    minimumAdvancePayment?: number;
}

export interface ITurf {
    _id?: Types.ObjectId;
    createdBy: Types.ObjectId;
    owner?: Types.ObjectId;

    sportType: SportType;
    turfSize: TurfSize;
    surfaceType: SurfaceType;

    title: string;
    slug: string;
    propertyNumber: string;
    description: string;

    highlights?: ITurfHighlight[];
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

    // Turf-specific attributes
    hasFloodlights: boolean;
    slotDurationMinutes: number;
    minimumBookingMinutes: number;
    maximumBookingMinutes?: number;
    bufferMinutes?: number;
    operatingSchedule: IWeeklySchedule[];
    equipmentRentalAvailable?: boolean;
    equipmentIncluded?: boolean;
    capacity?: number;
    changingRoomAvailable?: boolean;
    showerAvailable?: boolean;
    parkingAvailable?: boolean;

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

