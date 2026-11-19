import { Types } from "mongoose";

export enum ListingCategory {
    HOME = "HOME",
    STAY = "STAY",
    TURF = "TURF",
    PROPERTY = "PROPERTY",
}

export enum ListingSubCategory {
    FAMILY_FLAT = "FAMILY_FLAT",
    BACHELOR_SEAT = "BACHELOR_SEAT",
    SINGLE_ROOM = "SINGLE_ROOM",
    SUBLET = "SUBLET",

    HOTEL = "HOTEL",
    RESORT = "RESORT",
    GUEST_HOUSE = "GUEST_HOUSE",
    HOLIDAY_HOME = "HOLIDAY_HOME",
    SERVICED_APARTMENT = "SERVICED_APARTMENT",

    FOOTBALL_TURF = "FOOTBALL_TURF",
    CRICKET_TURF = "CRICKET_TURF",
    BADMINTON_COURT = "BADMINTON_COURT",
    BASKETBALL_COURT = "BASKETBALL_COURT",
    MULTI_SPORT_ARENA = "MULTI_SPORT_ARENA",

    APARTMENT = "APARTMENT",
    DUPLEX = "DUPLEX",
    BUILDING = "BUILDING",
    RESIDENTIAL_PLOT = "RESIDENTIAL_PLOT",
    COMMERCIAL_SPACE = "COMMERCIAL_SPACE",
}

export enum PriceUnit {
    PER_MONTH = "PER_MONTH",
    PER_NIGHT = "PER_NIGHT",
    PER_HOUR = "PER_HOUR",
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
    SOLD = "SOLD",
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

export enum CancellationPolicy {
    FLEXIBLE = "FLEXIBLE",
    MODERATE = "MODERATE",
    STRICT = "STRICT",
}

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

// Defines a single opening or closing time range.
export interface ITimeRange {
    startTime: string; // 24-hour format, e.g. 09:00
    endTime: string; // 24-hour format, e.g. 22:00
}

// Defines opening days and time slots for each day.
export interface IWeeklySchedule {
    day: WeekDay;
    isOpen: boolean;
    timeSlots: ITimeRange[];
}

// Defines a booking duration with its unit.
export interface IBookingDuration {
    value: number;
    unit: BookingDurationUnit;
}

// Additional title and description information for a listing.
export interface IListingHighlight {
    title: string;
    description: string;
}

// Defines common booking rules.
export interface IBookingRules {
    requiresApproval?: boolean;
    advanceBookingHours?: number;
    cancellationWindowHours?: number;
    cancellationPolicy?: CancellationPolicy;
    allowSameDayBooking?: boolean;
    minimumAdvancePayment?: number;
}

// HOME listing details.
export interface IHomeDetails {
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
}

// STAY listing details, including hotels and resorts.
export interface IStayDetails {
    stayType: StayType;
    roomType: RoomType;

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
}

// TURF listing details.
export interface ITurfDetails {
    sportType: SportType;
    turfSize: TurfSize;
    surfaceType: SurfaceType;

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
}

// PROPERTY listing details.
export interface IPropertyDetails {
    propertyType: PropertyType;
    ownershipType: OwnershipType;

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
}

// Main listing interface.
export interface IListing {
    _id?: Types.ObjectId;

    // User who created the listing.
    createdBy: Types.ObjectId;

    // Platform user account of the property owner, if available.
    owner?: Types.ObjectId;

    category: ListingCategory;
    subCategory: ListingSubCategory;

    title: string;
    slug: string;
    propertyNumber: string;
    description: string;

    highlights?: IListingHighlight[];

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

    minimumBookingDuration?: IBookingDuration;
    maximumBookingDuration?: IBookingDuration;

    homeDetails?: IHomeDetails;
    stayDetails?: IStayDetails;
    turfDetails?: ITurfDetails;
    propertyDetails?: IPropertyDetails;

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




