import { Types } from "mongoose";
import httpStatus from "http-status";
import crypto from "crypto";
import ApiError from "../../../errors/ApiError";
import { IProperty, ListingStatus, AvailabilityStatus, PropertyType, CompletionStatus } from "./property.interface";
import { PropertyModel } from "./property.model";
import { FavoriteModel } from "../favorite/favorite.model";
import { UserModel } from "../auth/auth.model";
import { activityLogServices } from "../activityLog/activityLog.services";
import { propertyRedis } from "./property.redis";
import { notificationServices } from "../notification/notification.services";
import { lastViewedServices } from "../lastViewed/lastViewed.services";

const syncUserPropertyFlag = async (userId: Types.ObjectId) => {
    try {
        await UserModel.findByIdAndUpdate(userId, { hasProperty: true });
    } catch (err) {
        console.error("⚠️ [User Property Flag Sync Error]:", err);
    }
};

const toBoolean = (val: any): boolean | undefined => {
    if (val === undefined || val === null || val === "") return undefined;
    if (typeof val === "boolean") return val;
    const str = String(val).trim().toLowerCase();
    if (str === "true" || str === "1") return true;
    if (str === "false" || str === "0") return false;
    return undefined;
};

const createProperty = async (userId: string, userRole: string, payload: Partial<IProperty> & { propertyDetails?: Record<string, any> }, meta?: { ip?: string; userAgent?: string }) => {
    const creatorId = new Types.ObjectId(userId);
    const ownerId = payload.owner ? new Types.ObjectId(payload.owner as any) : creatorId;

    const isAdmin = userRole === "ADMIN";
    const status = isAdmin ? ListingStatus.ACTIVE : ListingStatus.PENDING_APPROVAL;
    const isVerified = isAdmin;
    const approvedBy = isAdmin ? creatorId : undefined;
    const approvedAt = isAdmin ? new Date() : undefined;
    const publishedAt = isAdmin ? new Date() : undefined;

    let slug = payload.slug;
    if (!slug && payload.title) {
        const baseSlug = payload.title
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, "")
            .replace(/[\s_-]+/g, "-")
            .replace(/^-+|-+$/g, "");
        const randomSuffix = crypto.randomBytes(3).toString("hex");
        slug = `${baseSlug || "property"}-${randomSuffix}`;
    }

    const { propertyDetails, ...restPayload } = payload;
    const flattenedDetails = propertyDetails || {};

    const propertyData: Partial<IProperty> = {
        ...flattenedDetails,
        ...restPayload,
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
        favoritesCount: 0,
        bookmarksCount: 0,
        ratingAverage: 0,
        totalReviews: 0,
        isDeleted: false,
    };

    const property = await PropertyModel.create(propertyData);
    await syncUserPropertyFlag(creatorId);

    activityLogServices.createActivityLog({
        user: creatorId,
        role: userRole,
        action: "CREATE_LISTING",
        module: "PROPERTY" as any,
        description: `Created new PROPERTY listing: "${property.title}"`,
        status: "SUCCESS",
        ipAddress: meta?.ip,
        userAgent: meta?.userAgent,
        metadata: {
            propertyId: property._id,
            propertyType: property.propertyType,
            price: property.price,
            status: property.status,
        },
    });

    propertyRedis.invalidateProperty(property._id.toString(), property.slug, property.propertyNumber);
    return property;
};

const getAllProperties = async (filters: Record<string, any>, reqUser?: { _id?: string; role?: string }) => {
    const isAdmin = reqUser?.role === "ADMIN";
    const queryFingerprint = propertyRedis.generateQueryFingerprint(filters);

    if (!isAdmin) {
        const cached = await propertyRedis.getCachedSearch(queryFingerprint);
        if (cached) return cached;
    }

    const query: Record<string, any> = { isDeleted: false };

    if (!isAdmin) {
        query.status = ListingStatus.ACTIVE;
    } else if (filters.status) {
        query.status = filters.status;
    }

    if (filters.availabilityStatus) query.availabilityStatus = filters.availabilityStatus;
    if (filters.propertyType) query.propertyType = filters.propertyType;
    if (filters.ownershipType) query.ownershipType = filters.ownershipType;
    if (filters.completionStatus) query.completionStatus = filters.completionStatus;

    if (filters.bedrooms !== undefined && filters.bedrooms !== "") {
        query.bedrooms = Number(filters.bedrooms);
    }
    if (filters.bathrooms !== undefined && filters.bathrooms !== "") {
        query.bathrooms = Number(filters.bathrooms);
    }

    if (filters.minLandArea !== undefined && filters.minLandArea !== "") {
        query.landAreaSqFt = { $gte: Number(filters.minLandArea) };
    }
    if (filters.minFlatSize !== undefined && filters.minFlatSize !== "") {
        query.flatSizeSqFt = { $gte: Number(filters.minFlatSize) };
    }

    const registeredDeedReady = toBoolean(filters.registeredDeedReady);
    if (registeredDeedReady !== undefined) query.registeredDeedReady = registeredDeedReady;

    const isFeatured = toBoolean(filters.isFeatured);
    if (isFeatured !== undefined) query.isFeatured = isFeatured;

    const isVerified = toBoolean(filters.isVerified);
    if (isVerified !== undefined) query.isVerified = isVerified;

    if (filters.city) {
        query["location.city"] = { $regex: new RegExp(`^${filters.city.trim()}$`, "i") };
    }
    if (filters.area) {
        query["location.area"] = { $regex: new RegExp(filters.area.trim(), "i") };
    }

    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
        query.price = {};
        if (filters.minPrice !== undefined && filters.minPrice !== "") {
            query.price.$gte = Number(filters.minPrice);
        }
        if (filters.maxPrice !== undefined && filters.maxPrice !== "") {
            query.price.$lte = Number(filters.maxPrice);
        }
    }

    if (filters.searchTerm) {
        query.$text = { $search: filters.searchTerm.trim() };
    }

    if (filters.lng !== undefined && filters.lat !== undefined) {
        const lng = Number(filters.lng);
        const lat = Number(filters.lat);
        const maxDistance = filters.maxDistance ? Number(filters.maxDistance) : 5000;
        if (!isNaN(lng) && !isNaN(lat)) {
            query["location.geo"] = {
                $near: {
                    $geometry: { type: "Point", coordinates: [lng, lat] },
                    $maxDistance: maxDistance,
                },
            };
        }
    }

    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 10));
    const skip = (page - 1) * limit;

    const sortField = filters.sortBy || "createdAt";
    const sortOrder = filters.sortOrder === "asc" ? 1 : -1;
    const sort: Record<string, any> = { [sortField]: sortOrder };

    const [properties, total] = await Promise.all([
        PropertyModel.find(query)
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .populate("createdBy", "name email phone profileImage")
            .populate("owner", "name email phone profileImage")
            .lean(),
        PropertyModel.countDocuments(query),
    ]);

    const result = {
        meta: {
            page,
            limit,
            total,
            totalPage: Math.ceil(total / limit),
        },
        data: properties,
    };

    if (!isAdmin) {
        await propertyRedis.setCachedSearch(queryFingerprint, result);
    }

    return result;
};

const getFeaturedProperties = async (limit: number = 8) => {
    const cached = await propertyRedis.getCachedFeaturedProperties(limit);
    if (cached) return cached;

    const properties = await PropertyModel.find({
        status: ListingStatus.ACTIVE,
        isFeatured: true,
        isDeleted: false,
    })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate("createdBy", "name email phone profileImage")
        .lean();

    await propertyRedis.setCachedFeaturedProperties(limit, properties);
    return properties;
};

const getPropertyStats = async () => {
    const cached = await propertyRedis.getCachedPropertyStats();
    if (cached) return cached;

    const [total, active, pendingApproval] = await Promise.all([
        PropertyModel.countDocuments({ isDeleted: false }),
        PropertyModel.countDocuments({ status: ListingStatus.ACTIVE, isDeleted: false }),
        PropertyModel.countDocuments({ status: ListingStatus.PENDING_APPROVAL, isDeleted: false }),
    ]);

    const stats = {
        total,
        active,
        pendingApproval,
    };

    await propertyRedis.setCachedPropertyStats(stats);
    return stats;
};

const getMyProperties = async (userId: string, filters: Record<string, any>) => {
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 10));
    const skip = (page - 1) * limit;

    const query: Record<string, any> = {
        createdBy: new Types.ObjectId(userId),
        isDeleted: false,
    };

    if (filters.status) query.status = filters.status;

    const [properties, total] = await Promise.all([
        PropertyModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        PropertyModel.countDocuments(query),
    ]);

    return {
        meta: {
            page,
            limit,
            total,
            totalPage: Math.ceil(total / limit),
        },
        data: properties,
    };
};

const getPropertyByIdOrSlug = async (idOrSlug: string, reqUser?: { _id?: string; role?: string }, meta?: { ip?: string; userAgent?: string; visitorId?: string }) => {
    const isObjectId = Types.ObjectId.isValid(idOrSlug);
    const filter: Record<string, any> = { isDeleted: false };

    if (isObjectId) {
        filter._id = new Types.ObjectId(idOrSlug);
    } else {
        filter.$or = [{ slug: idOrSlug.toLowerCase() }, { propertyNumber: idOrSlug }];
    }

    const property = await PropertyModel.findOne(filter)
        .populate("createdBy", "name email phone profileImage isVerified")
        .populate("owner", "name email phone profileImage isVerified")
        .lean();

    if (!property) {
        throw new ApiError(httpStatus.NOT_FOUND, "Property listing not found.");
    }

    const viewerId = reqUser?._id;
    const isOwnerOrAdmin = viewerId === (property.createdBy as any)?._id?.toString() || reqUser?.role === "ADMIN";
    if (!isOwnerOrAdmin) {
        await PropertyModel.updateOne({ _id: property._id }, { $inc: { viewsCount: 1 } });
    }

    let isFavorite = false;
    if (viewerId) {
        lastViewedServices.recordLastViewed(viewerId, property._id as Types.ObjectId, "PROPERTY", "Property");
        const fav = await FavoriteModel.exists({
            user: new Types.ObjectId(viewerId),
            listing: property._id,
            isDeleted: false,
        });
        isFavorite = !!fav;
    }

    return { ...property, isFavorite };
};

const updateProperty = async (id: string, userId: string, userRole: string, payload: Partial<IProperty> & { propertyDetails?: Record<string, any> }, meta?: { ip?: string; userAgent?: string }) => {
    const property = await PropertyModel.findOne({ _id: id, isDeleted: false });
    if (!property) {
        throw new ApiError(httpStatus.NOT_FOUND, "Property listing not found.");
    }

    const isCreator = property.createdBy.toString() === userId;
    const isAdmin = userRole === "ADMIN";
    if (!isCreator && !isAdmin) {
        throw new ApiError(httpStatus.FORBIDDEN, "You are not authorized to update this property listing.");
    }

    const { propertyDetails, ...restPayload } = payload;
    const flattened = { ...(propertyDetails || {}), ...restPayload };

    if (flattened.title && flattened.title !== property.title && !flattened.slug) {
        const baseSlug = flattened.title
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, "")
            .replace(/[\s_-]+/g, "-")
            .replace(/^-+|-+$/g, "");
        const randomSuffix = crypto.randomBytes(3).toString("hex");
        flattened.slug = `${baseSlug || "property"}-${randomSuffix}`;
    }

    if (!isAdmin && property.status === ListingStatus.REJECTED) {
        flattened.status = ListingStatus.PENDING_APPROVAL;
    }

    const updated = await PropertyModel.findByIdAndUpdate(id, flattened, {
        new: true,
        runValidators: true,
    })
        .populate("createdBy", "name email phone profileImage")
        .populate("owner", "name email phone profileImage");

    if (updated) {
        propertyRedis.invalidateProperty(updated._id.toString(), updated.slug, updated.propertyNumber);
    }

    activityLogServices.createActivityLog({
        user: new Types.ObjectId(userId),
        role: userRole,
        action: "UPDATE_LISTING",
        module: "PROPERTY" as any,
        description: `Updated PROPERTY listing: "${property.title}"`,
        status: "SUCCESS",
        ipAddress: meta?.ip,
        userAgent: meta?.userAgent,
        metadata: { propertyId: id },
    });

    return updated;
};

const updateAvailabilityStatus = async (id: string, userId: string, userRole: string, status: AvailabilityStatus) => {
    const property = await PropertyModel.findOne({ _id: id, isDeleted: false });
    if (!property) {
        throw new ApiError(httpStatus.NOT_FOUND, "Property listing not found.");
    }

    const isCreator = property.createdBy.toString() === userId;
    const isAdmin = userRole === "ADMIN";
    if (!isCreator && !isAdmin) {
        throw new ApiError(httpStatus.FORBIDDEN, "You are not authorized to update availability status.");
    }

    property.availabilityStatus = status;
    await property.save();

    propertyRedis.invalidateProperty(property._id.toString(), property.slug, property.propertyNumber);
    return property;
};

const deleteProperty = async (id: string, userId: string, userRole: string, meta?: { ip?: string; userAgent?: string }) => {
    const property = await PropertyModel.findOne({ _id: id, isDeleted: false });
    if (!property) {
        throw new ApiError(httpStatus.NOT_FOUND, "Property listing not found.");
    }

    const isCreator = property.createdBy.toString() === userId;
    const isAdmin = userRole === "ADMIN";
    if (!isCreator && !isAdmin) {
        throw new ApiError(httpStatus.FORBIDDEN, "You are not authorized to delete this property listing.");
    }

    property.isDeleted = true;
    property.status = ListingStatus.INACTIVE;
    await property.save();

    propertyRedis.invalidateProperty(property._id.toString(), property.slug, property.propertyNumber);

    activityLogServices.createActivityLog({
        user: new Types.ObjectId(userId),
        role: userRole,
        action: "DELETE_LISTING",
        module: "PROPERTY" as any,
        description: `Soft deleted PROPERTY listing: "${property.title}"`,
        status: "SUCCESS",
        ipAddress: meta?.ip,
        userAgent: meta?.userAgent,
        metadata: { propertyId: id },
    });

    return { message: "Property listing deleted successfully." };
};

const approveOrRejectProperty = async (
    id: string,
    adminId: string,
    payload: { action: "APPROVE" | "REJECT"; rejectionReason?: string },
    meta?: { ip?: string; userAgent?: string }
) => {
    const property = await PropertyModel.findOne({ _id: id, isDeleted: false });
    if (!property) {
        throw new ApiError(httpStatus.NOT_FOUND, "Property listing not found.");
    }

    const isApprove = payload.action === "APPROVE";
    property.status = isApprove ? ListingStatus.ACTIVE : ListingStatus.REJECTED;
    property.approvedBy = new Types.ObjectId(adminId);
    property.approvedAt = new Date();

    if (isApprove) {
        property.publishedAt = property.publishedAt || new Date();
        property.rejectionReason = undefined;
    } else {
        property.rejectionReason = payload.rejectionReason || "Listing rejected by moderation team.";
    }

    await property.save();
    propertyRedis.invalidateProperty(property._id.toString(), property.slug, property.propertyNumber);

    notificationServices.createNotification({
        recipient: property.createdBy,
        sender: new Types.ObjectId(adminId),
        title: isApprove ? "Property Listing Approved!" : "Property Listing Rejected",
        message: isApprove
            ? `Your property listing "${property.title}" has been reviewed and approved.`
            : `Your property listing "${property.title}" was rejected: ${property.rejectionReason}`,
        type: isApprove ? "LISTING_APPROVED" as any : "LISTING_REJECTED" as any,
        data: { propertyId: property._id.toString() },
    }).catch((err) => console.error("⚠️ [Notification Error]:", err));

    activityLogServices.createActivityLog({
        user: new Types.ObjectId(adminId),
        role: "ADMIN",
        action: "MODERATE_LISTING",
        module: "PROPERTY" as any,
        description: `${isApprove ? "Approved" : "Rejected"} PROPERTY listing: "${property.title}"`,
        status: "SUCCESS",
        ipAddress: meta?.ip,
        userAgent: meta?.userAgent,
        metadata: { propertyId: id, status: property.status, rejectionReason: property.rejectionReason },
    });

    return property;
};

const toggleFeatureStatus = async (id: string) => {
    const property = await PropertyModel.findOne({ _id: id, isDeleted: false });
    if (!property) {
        throw new ApiError(httpStatus.NOT_FOUND, "Property listing not found.");
    }

    property.isFeatured = !property.isFeatured;
    await property.save();

    propertyRedis.invalidateProperty(property._id.toString(), property.slug, property.propertyNumber);
    return property;
};

const toggleVerification = async (id: string) => {
    const property = await PropertyModel.findOne({ _id: id, isDeleted: false });
    if (!property) {
        throw new ApiError(httpStatus.NOT_FOUND, "Property listing not found.");
    }

    property.isVerified = !property.isVerified;
    await property.save();

    propertyRedis.invalidateProperty(property._id.toString(), property.slug, property.propertyNumber);
    return property;
};

export const propertyServices = {
    createProperty,
    getAllProperties,
    getFeaturedProperties,
    getPropertyStats,
    getMyProperties,
    getPropertyByIdOrSlug,
    updateProperty,
    updateAvailabilityStatus,
    deleteProperty,
    approveOrRejectProperty,
    toggleFeatureStatus,
    toggleVerification,
};
