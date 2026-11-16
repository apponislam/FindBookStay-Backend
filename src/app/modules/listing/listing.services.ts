import { Types } from "mongoose";
import httpStatus from "http-status";
import crypto from "crypto";
import ApiError from "../../../errors/ApiError";
import {
    IListing,
    IListingFilterOptions,
    ListingCategory,
    ListingStatus,
    AvailabilityStatus,
} from "./listing.interface";
import { ListingModel } from "./listing.model";
import { UserModel } from "../auth/auth.model";
import { activityLogServices } from "../activityLog/activityLog.services";

/**
 * Update user category flags (hasHome, hasStay, hasTurf, hasProperty)
 */
const syncUserCategoryFlag = async (userId: Types.ObjectId, category: ListingCategory) => {
    try {
        const flagMap: Record<ListingCategory, string> = {
            [ListingCategory.HOME]: "hasHome",
            [ListingCategory.STAY]: "hasStay",
            [ListingCategory.TURF]: "hasTurf",
            [ListingCategory.PROPERTY]: "hasProperty",
        };

        const fieldName = flagMap[category];
        if (fieldName) {
            await UserModel.findByIdAndUpdate(userId, { [fieldName]: true });
        }
    } catch (err) {
        console.error("⚠️ [User Category Flag Sync Error]:", err);
    }
};

/**
 * Create a new listing
 */
const createListing = async (
    userId: string,
    userRole: string,
    payload: Partial<IListing>,
    meta?: { ip?: string; userAgent?: string }
) => {
    const creatorId = new Types.ObjectId(userId);
    const ownerId = payload.owner ? new Types.ObjectId(payload.owner as any) : creatorId;

    // Admin created listings can be automatically approved & active
    const isAdmin = userRole === "ADMIN";
    const status = isAdmin ? ListingStatus.ACTIVE : ListingStatus.PENDING_APPROVAL;
    const isVerified = isAdmin;
    const approvedBy = isAdmin ? creatorId : undefined;
    const approvedAt = isAdmin ? new Date() : undefined;
    const publishedAt = isAdmin ? new Date() : undefined;

    // Generate unique slug
    let slug = payload.slug;
    if (!slug && payload.title) {
        const baseSlug = payload.title
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, "")
            .replace(/[\s_-]+/g, "-")
            .replace(/^-+|-+$/g, "");
        const randomSuffix = crypto.randomBytes(3).toString("hex");
        slug = `${baseSlug || "listing"}-${randomSuffix}`;
    }

    const listingData: Partial<IListing> = {
        ...payload,
        createdBy: creatorId,
        owner: ownerId,
        slug,
        status,
        availabilityStatus: payload.availabilityStatus || AvailabilityStatus.AVAILABLE,
        isVerified,
        approvedBy,
        approvedAt,
        publishedAt,
        viewsCount: 0,
        ratingAverage: 0,
        totalReviews: 0,
        isDeleted: false,
    };

    const listing = await ListingModel.create(listingData);

    // Sync user hasHome, hasStay, etc.
    if (payload.category) {
        await syncUserCategoryFlag(creatorId, payload.category);
    }

    // Audit Activity Log
    activityLogServices.createActivityLog({
        user: creatorId,
        role: userRole,
        action: "CREATE_LISTING",
        module: payload.category as any,
        description: `Created new ${payload.category} listing: "${listing.title}"`,
        status: "SUCCESS",
        ipAddress: meta?.ip,
        userAgent: meta?.userAgent,
        metadata: {
            listingId: listing._id,
            category: listing.category,
            subCategory: listing.subCategory,
            price: listing.price,
            status: listing.status,
        },
    });

    return listing;
};

/**
 * Get all listings with advanced filtering, full-text search, geo-radius, and pagination
 */
const getAllListings = async (
    filters: IListingFilterOptions,
    reqUser?: { _id?: string; role?: string }
) => {
    const query: any = { isDeleted: false };

    // 1. Category and SubCategory
    if (filters.category) {
        query.category = filters.category;
    }
    if (filters.subCategory) {
        query.subCategory = filters.subCategory;
    }

    // 2. Status handling:
    // If an Admin asks for a specific status, honor it.
    // If not specified or called by public user, strictly return ACTIVE listings.
    if (filters.status && reqUser?.role === "ADMIN") {
        query.status = filters.status;
    } else {
        query.status = ListingStatus.ACTIVE;
    }

    // 3. Availability Status
    if (filters.availabilityStatus) {
        query.availabilityStatus = filters.availabilityStatus;
    }

    // 4. Pricing Range
    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
        query.price = {};
        if (filters.minPrice !== undefined) {
            query.price.$gte = Number(filters.minPrice);
        }
        if (filters.maxPrice !== undefined) {
            query.price.$lte = Number(filters.maxPrice);
        }
    }
    if (filters.priceUnit) {
        query.priceUnit = filters.priceUnit;
    }
    if (filters.isNegotiable !== undefined) {
        query.isNegotiable = filters.isNegotiable === true || String(filters.isNegotiable) === "true";
    }

    // 5. Location Search
    if (filters.city) {
        query["location.city"] = { $regex: filters.city, $options: "i" };
    }
    if (filters.area) {
        query["location.area"] = { $regex: filters.area, $options: "i" };
    }
    if (filters.country) {
        query["location.country"] = { $regex: filters.country, $options: "i" };
    }

    // 6. Geospatial Radius Search ($geoWithin / $centerSphere)
    if (filters.lat !== undefined && filters.lng !== undefined) {
        const radiusInKm = Number(filters.radiusInKm) || 10;
        const radiusInRadians = radiusInKm / 6378.1; // Earth radius in km
        query["location.geo"] = {
            $geoWithin: {
                $centerSphere: [[Number(filters.lng), Number(filters.lat)], radiusInRadians],
            },
        };
    }

    // 7. Keyword Search (title, description, area, city)
    const searchTerm = filters.searchTerm;
    if (searchTerm && typeof searchTerm === "string" && searchTerm.trim().length > 0) {
        const term = searchTerm.trim();
        query.$or = [
            { title: { $regex: term, $options: "i" } },
            { description: { $regex: term, $options: "i" } },
            { "location.address": { $regex: term, $options: "i" } },
            { "location.area": { $regex: term, $options: "i" } },
            { "location.city": { $regex: term, $options: "i" } },
        ];
    }

    // 8. Badges & Attributes
    if (filters.isFeatured !== undefined) {
        query.isFeatured = filters.isFeatured === true || String(filters.isFeatured) === "true";
    }
    if (filters.isVerified !== undefined) {
        query.isVerified = filters.isVerified === true || String(filters.isVerified) === "true";
    }

    // Amenities
    if (filters.amenities) {
        const amenitiesList = Array.isArray(filters.amenities)
            ? filters.amenities
            : String(filters.amenities).split(",").map((s) => s.trim());
        if (amenitiesList.length > 0) {
            query.amenities = { $all: amenitiesList };
        }
    }

    // 9. Vertical-Specific Filters
    // HOME
    if (filters.targetTenant) query["homeDetails.targetTenant"] = filters.targetTenant;
    if (filters.rentType) query["homeDetails.rentType"] = filters.rentType;
    if (filters.bedrooms !== undefined) query["homeDetails.bedrooms"] = { $gte: Number(filters.bedrooms) };
    if (filters.bathrooms !== undefined) query["homeDetails.bathrooms"] = { $gte: Number(filters.bathrooms) };
    if (filters.isFurnished !== undefined) {
        query["homeDetails.isFurnished"] = filters.isFurnished === true || String(filters.isFurnished) === "true";
    }

    // STAY
    if (filters.stayType) query["stayDetails.stayType"] = filters.stayType;
    if (filters.roomType) query["stayDetails.roomType"] = filters.roomType;
    if (filters.maxGuests !== undefined) query["stayDetails.maxGuests"] = { $gte: Number(filters.maxGuests) };
    if (filters.freeBreakfast !== undefined) {
        query["stayDetails.freeBreakfast"] = filters.freeBreakfast === true || String(filters.freeBreakfast) === "true";
    }

    // TURF
    if (filters.sportType) query["turfDetails.sportType"] = filters.sportType;
    if (filters.turfSize) query["turfDetails.turfSize"] = filters.turfSize;
    if (filters.surfaceType) query["turfDetails.surfaceType"] = filters.surfaceType;
    if (filters.hasFloodlights !== undefined) {
        query["turfDetails.hasFloodlights"] = filters.hasFloodlights === true || String(filters.hasFloodlights) === "true";
    }

    // PROPERTY
    if (filters.propertyType) query["propertyDetails.propertyType"] = filters.propertyType;
    if (filters.ownershipType) query["propertyDetails.ownershipType"] = filters.ownershipType;
    if (filters.completionStatus) query["propertyDetails.completionStatus"] = filters.completionStatus;

    // 10. Pagination & Sorting
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 12));
    const skip = (page - 1) * limit;

    let sort: any = { isFeatured: -1, createdAt: -1 };
    if (filters.sortBy) {
        const order = filters.sortOrder === "asc" ? 1 : -1;
        if (filters.sortBy === "price") {
            sort = { price: order };
        } else if (filters.sortBy === "viewsCount") {
            sort = { viewsCount: order };
        } else if (filters.sortBy === "ratingAverage") {
            sort = { ratingAverage: order };
        } else if (filters.sortBy === "createdAt") {
            sort = { createdAt: order };
        }
    }

    const [listings, total] = await Promise.all([
        ListingModel.find(query)
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .populate("createdBy", "name email phone profileImage")
            .populate("owner", "name email phone profileImage")
            .lean(),
        ListingModel.countDocuments(query),
    ]);

    return {
        meta: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
        data: listings,
    };
};

/**
 * Get listing by ID or Slug (with automatic view counter increment)
 */
const getListingByIdOrSlug = async (
    idOrSlug: string,
    reqUser?: { _id?: string; role?: string }
) => {
    const isId = Types.ObjectId.isValid(idOrSlug);
    const filter: any = isId
        ? { $or: [{ _id: idOrSlug }, { slug: idOrSlug.toLowerCase() }], isDeleted: false }
        : { slug: idOrSlug.toLowerCase(), isDeleted: false };

    const listing = await ListingModel.findOne(filter)
        .populate("createdBy", "name email phone profileImage")
        .populate("owner", "name email phone profileImage");

    if (!listing) {
        throw new ApiError(httpStatus.NOT_FOUND, "The requested listing could not be found.");
    }

    // Access control: if listing is not ACTIVE, only creator or ADMIN can view it
    if (listing.status !== ListingStatus.ACTIVE) {
        const isOwner = reqUser?._id && listing.createdBy?._id?.toString() === reqUser._id.toString();
        const isAdmin = reqUser?.role === "ADMIN";

        if (!isOwner && !isAdmin) {
            throw new ApiError(
                httpStatus.FORBIDDEN,
                "This listing is currently pending approval or inactive and is not publicly visible."
            );
        }
    }

    // Increment views count atomically
    await ListingModel.findByIdAndUpdate(listing._id, { $inc: { viewsCount: 1 } });
    listing.viewsCount += 1;

    return listing;
};

/**
 * Get user's own listings
 */
const getMyListings = async (userId: string, filters: IListingFilterOptions) => {
    const query: any = {
        createdBy: new Types.ObjectId(userId),
        isDeleted: false,
    };

    if (filters.category) query.category = filters.category;
    if (filters.status) query.status = filters.status;
    if (filters.availabilityStatus) query.availabilityStatus = filters.availabilityStatus;

    if (filters.searchTerm) {
        const term = filters.searchTerm.trim();
        query.$or = [
            { title: { $regex: term, $options: "i" } },
            { description: { $regex: term, $options: "i" } },
            { "location.address": { $regex: term, $options: "i" } },
            { "location.city": { $regex: term, $options: "i" } },
        ];
    }

    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 10));
    const skip = (page - 1) * limit;

    const [listings, total] = await Promise.all([
        ListingModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        ListingModel.countDocuments(query),
    ]);

    return {
        meta: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
        data: listings,
    };
};

/**
 * Update listing
 */
const updateListing = async (
    id: string,
    userId: string,
    userRole: string,
    payload: Partial<IListing>,
    meta?: { ip?: string; userAgent?: string }
) => {
    if (!Types.ObjectId.isValid(id)) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Invalid listing ID format.");
    }

    const listing = await ListingModel.findOne({ _id: id, isDeleted: false });
    if (!listing) {
        throw new ApiError(httpStatus.NOT_FOUND, "Listing not found.");
    }

    const isAdmin = userRole === "ADMIN";
    const isOwner = listing.createdBy.toString() === userId.toString();

    if (!isAdmin && !isOwner) {
        throw new ApiError(httpStatus.FORBIDDEN, "You do not have permission to modify this listing.");
    }

    // Sanitize administrative fields if caller is not an Admin
    if (!isAdmin) {
        delete payload.isVerified;
        delete payload.isFeatured;
        delete payload.status;
        delete payload.approvedBy;
        delete payload.approvedAt;
        delete payload.rejectionReason;
    }

    // Regenerate slug if title is updated
    if (payload.title && payload.title !== listing.title) {
        const baseSlug = payload.title
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, "")
            .replace(/[\s_-]+/g, "-")
            .replace(/^-+|-+$/g, "");
        const randomSuffix = crypto.randomBytes(3).toString("hex");
        payload.slug = `${baseSlug || "listing"}-${randomSuffix}`;
    }

    const updated = await ListingModel.findByIdAndUpdate(id, payload, {
        new: true,
        runValidators: true,
    })
        .populate("createdBy", "name email phone profileImage")
        .populate("owner", "name email phone profileImage");

    // Audit log
    activityLogServices.createActivityLog({
        user: new Types.ObjectId(userId),
        role: userRole,
        action: "UPDATE_LISTING",
        module: (listing.category as any) || "SYSTEM",
        description: `Updated listing "${listing.title}"`,
        status: "SUCCESS",
        ipAddress: meta?.ip,
        userAgent: meta?.userAgent,
        metadata: { listingId: listing._id },
    });

    return updated;
};

/**
 * Soft delete listing
 */
const deleteListing = async (
    id: string,
    userId: string,
    userRole: string,
    meta?: { ip?: string; userAgent?: string }
) => {
    if (!Types.ObjectId.isValid(id)) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Invalid listing ID format.");
    }

    const listing = await ListingModel.findOne({ _id: id, isDeleted: false });
    if (!listing) {
        throw new ApiError(httpStatus.NOT_FOUND, "Listing not found.");
    }

    const isAdmin = userRole === "ADMIN";
    const isOwner = listing.createdBy.toString() === userId.toString();

    if (!isAdmin && !isOwner) {
        throw new ApiError(httpStatus.FORBIDDEN, "You do not have permission to delete this listing.");
    }

    listing.isDeleted = true;
    await listing.save();

    // Audit log
    activityLogServices.createActivityLog({
        user: new Types.ObjectId(userId),
        role: userRole,
        action: "DELETE_LISTING",
        module: (listing.category as any) || "SYSTEM",
        description: `Soft deleted listing "${listing.title}"`,
        status: "SUCCESS",
        ipAddress: meta?.ip,
        userAgent: meta?.userAgent,
        metadata: { listingId: listing._id },
    });

    return { message: "Listing deleted successfully." };
};

/**
 * Approve or Reject Listing (Admin Only)
 */
const approveOrRejectListing = async (
    id: string,
    adminId: string,
    payload: { status: "ACTIVE" | "REJECTED"; rejectionReason?: string },
    meta?: { ip?: string; userAgent?: string }
) => {
    if (!Types.ObjectId.isValid(id)) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Invalid listing ID format.");
    }

    const listing = await ListingModel.findOne({ _id: id, isDeleted: false });
    if (!listing) {
        throw new ApiError(httpStatus.NOT_FOUND, "Listing not found.");
    }

    if (payload.status === "ACTIVE") {
        listing.status = ListingStatus.ACTIVE;
        listing.isVerified = true;
        listing.approvedBy = new Types.ObjectId(adminId);
        listing.approvedAt = new Date();
        listing.publishedAt = listing.publishedAt || new Date();
        listing.rejectionReason = undefined;
    } else {
        listing.status = ListingStatus.REJECTED;
        listing.rejectionReason =
            payload.rejectionReason || "Listing does not comply with marketplace standards.";
    }

    await listing.save();

    // Audit log
    activityLogServices.createActivityLog({
        user: new Types.ObjectId(adminId),
        role: "ADMIN",
        action: payload.status === "ACTIVE" ? "APPROVE_LISTING" : "REJECT_LISTING",
        module: (listing.category as any) || "SYSTEM",
        description: `${payload.status === "ACTIVE" ? "Approved" : "Rejected"} listing "${listing.title}"`,
        status: "SUCCESS",
        ipAddress: meta?.ip,
        userAgent: meta?.userAgent,
        metadata: {
            listingId: listing._id,
            newStatus: listing.status,
            rejectionReason: listing.rejectionReason,
        },
    });

    return listing;
};

/**
 * Toggle Featured Status (Admin Only)
 */
const toggleFeatureStatus = async (id: string, adminId: string) => {
    if (!Types.ObjectId.isValid(id)) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Invalid listing ID format.");
    }

    const listing = await ListingModel.findOne({ _id: id, isDeleted: false });
    if (!listing) {
        throw new ApiError(httpStatus.NOT_FOUND, "Listing not found.");
    }

    listing.isFeatured = !listing.isFeatured;
    await listing.save();

    return listing;
};

/**
 * Toggle Verified Status (Admin Only)
 */
const toggleVerification = async (id: string, adminId: string) => {
    if (!Types.ObjectId.isValid(id)) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Invalid listing ID format.");
    }

    const listing = await ListingModel.findOne({ _id: id, isDeleted: false });
    if (!listing) {
        throw new ApiError(httpStatus.NOT_FOUND, "Listing not found.");
    }

    listing.isVerified = !listing.isVerified;
    await listing.save();

    return listing;
};

/**
 * Update Availability Status (Owner or Admin)
 */
const updateAvailabilityStatus = async (
    id: string,
    userId: string,
    userRole: string,
    availabilityStatus: AvailabilityStatus
) => {
    if (!Types.ObjectId.isValid(id)) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Invalid listing ID format.");
    }

    const listing = await ListingModel.findOne({ _id: id, isDeleted: false });
    if (!listing) {
        throw new ApiError(httpStatus.NOT_FOUND, "Listing not found.");
    }

    const isAdmin = userRole === "ADMIN";
    const isOwner = listing.createdBy.toString() === userId.toString();

    if (!isAdmin && !isOwner) {
        throw new ApiError(httpStatus.FORBIDDEN, "You do not have permission to update this listing.");
    }

    listing.availabilityStatus = availabilityStatus;
    await listing.save();

    return listing;
};

/**
 * Get Featured Listings across or within a category
 */
const getFeaturedListings = async (category?: ListingCategory, limit: number = 8) => {
    const query: any = {
        isFeatured: true,
        status: ListingStatus.ACTIVE,
        isDeleted: false,
    };
    if (category) query.category = category;

    const listings = await ListingModel.find(query)
        .sort({ createdAt: -1 })
        .limit(Number(limit) || 8)
        .populate("createdBy", "name email phone profileImage")
        .lean();

    return listings;
};

/**
 * Get Marketplace Overview Statistics
 */
const getListingStats = async () => {
    const [total, active, pending, categories, topCities] = await Promise.all([
        ListingModel.countDocuments({ isDeleted: false }),
        ListingModel.countDocuments({ status: ListingStatus.ACTIVE, isDeleted: false }),
        ListingModel.countDocuments({ status: ListingStatus.PENDING_APPROVAL, isDeleted: false }),
        ListingModel.aggregate([
            { $match: { isDeleted: false } },
            {
                $group: {
                    _id: "$category",
                    total: { $sum: 1 },
                    active: {
                        $sum: {
                            $cond: [{ $eq: ["$status", ListingStatus.ACTIVE] }, 1, 0],
                        },
                    },
                },
            },
        ]),
        ListingModel.aggregate([
            { $match: { status: ListingStatus.ACTIVE, isDeleted: false } },
            {
                $group: {
                    _id: "$location.city",
                    count: { $sum: 1 },
                },
            },
            { $sort: { count: -1 } },
            { $limit: 10 },
        ]),
    ]);

    return {
        totalListings: total,
        activeListings: active,
        pendingApprovalListings: pending,
        categories: categories.reduce((acc: any, curr) => {
            acc[curr._id] = { total: curr.total, active: curr.active };
            return acc;
        }, {}),
        topCities: topCities.map((c) => ({ city: c._id, count: c.count })),
    };
};

export const listingServices = {
    createListing,
    getAllListings,
    getListingByIdOrSlug,
    getMyListings,
    updateListing,
    deleteListing,
    approveOrRejectListing,
    toggleFeatureStatus,
    toggleVerification,
    updateAvailabilityStatus,
    getFeaturedListings,
    getListingStats,
};
