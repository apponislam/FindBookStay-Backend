import { Types } from "mongoose";
import httpStatus from "http-status";
import crypto from "crypto";
import ApiError from "../../../errors/ApiError";
import { ITurf, ListingStatus, AvailabilityStatus, SportType, TurfSize } from "./turf.interface";
import { TurfModel } from "./turf.model";
import { FavoriteModel } from "../favorite/favorite.model";
import { UserModel } from "../auth/auth.model";
import { activityLogServices } from "../activityLog/activityLog.services";
import { turfRedis } from "./turf.redis";
import { notificationServices } from "../notification/notification.services";
import { lastViewedServices } from "../lastViewed/lastViewed.services";

const syncUserTurfFlag = async (userId: Types.ObjectId) => {
    try {
        await UserModel.findByIdAndUpdate(userId, { hasTurf: true });
    } catch (err) {
        console.error("⚠️ [User Turf Flag Sync Error]:", err);
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

const createTurf = async (userId: string, userRole: string, payload: Partial<ITurf> & { turfDetails?: Record<string, any> }, meta?: { ip?: string; userAgent?: string }) => {
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
        slug = `${baseSlug || "turf"}-${randomSuffix}`;
    }

    const { turfDetails, ...restPayload } = payload;
    const flattenedDetails = turfDetails || {};

    const turfData: Partial<ITurf> = {
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

    const turf = await TurfModel.create(turfData);
    await syncUserTurfFlag(creatorId);

    activityLogServices.createActivityLog({
        user: creatorId,
        role: userRole,
        action: "CREATE_LISTING",
        module: "TURF" as any,
        description: `Created new TURF listing: "${turf.title}"`,
        status: "SUCCESS",
        ipAddress: meta?.ip,
        userAgent: meta?.userAgent,
        metadata: {
            turfId: turf._id,
            sportType: turf.sportType,
            price: turf.price,
            status: turf.status,
        },
    });

    turfRedis.invalidateTurf(turf._id.toString(), turf.slug, turf.propertyNumber);
    return turf;
};

const getAllTurfs = async (filters: Record<string, any>, reqUser?: { _id?: string; role?: string }) => {
    const isAdmin = reqUser?.role === "ADMIN";
    const queryFingerprint = turfRedis.generateQueryFingerprint(filters);

    if (!isAdmin) {
        const cached = await turfRedis.getCachedSearch(queryFingerprint);
        if (cached) return cached;
    }

    const query: Record<string, any> = { isDeleted: false };

    if (!isAdmin) {
        query.status = ListingStatus.ACTIVE;
    } else if (filters.status) {
        query.status = filters.status;
    }

    if (filters.availabilityStatus) query.availabilityStatus = filters.availabilityStatus;
    if (filters.sportType) query.sportType = filters.sportType;
    if (filters.turfSize) query.turfSize = filters.turfSize;
    if (filters.surfaceType) query.surfaceType = filters.surfaceType;

    const hasFloodlights = toBoolean(filters.hasFloodlights);
    if (hasFloodlights !== undefined) query.hasFloodlights = hasFloodlights;

    const equipmentRentalAvailable = toBoolean(filters.equipmentRentalAvailable);
    if (equipmentRentalAvailable !== undefined) query.equipmentRentalAvailable = equipmentRentalAvailable;

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

    const [turfs, total] = await Promise.all([
        TurfModel.find(query)
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .populate("createdBy", "name email phone profileImage")
            .populate("owner", "name email phone profileImage")
            .lean(),
        TurfModel.countDocuments(query),
    ]);

    const result = {
        meta: {
            page,
            limit,
            total,
            totalPage: Math.ceil(total / limit),
        },
        data: turfs,
    };

    if (!isAdmin) {
        await turfRedis.setCachedSearch(queryFingerprint, result);
    }

    return result;
};

const getFeaturedTurfs = async (limit: number = 8) => {
    const cached = await turfRedis.getCachedFeaturedTurfs(limit);
    if (cached) return cached;

    const turfs = await TurfModel.find({
        status: ListingStatus.ACTIVE,
        isFeatured: true,
        isDeleted: false,
    })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate("createdBy", "name email phone profileImage")
        .lean();

    await turfRedis.setCachedFeaturedTurfs(limit, turfs);
    return turfs;
};

const getTurfStats = async () => {
    const cached = await turfRedis.getCachedTurfStats();
    if (cached) return cached;

    const [total, active, pendingApproval] = await Promise.all([
        TurfModel.countDocuments({ isDeleted: false }),
        TurfModel.countDocuments({ status: ListingStatus.ACTIVE, isDeleted: false }),
        TurfModel.countDocuments({ status: ListingStatus.PENDING_APPROVAL, isDeleted: false }),
    ]);

    const stats = {
        total,
        active,
        pendingApproval,
    };

    await turfRedis.setCachedTurfStats(stats);
    return stats;
};

const getMyTurfs = async (userId: string, filters: Record<string, any>) => {
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 10));
    const skip = (page - 1) * limit;

    const query: Record<string, any> = {
        createdBy: new Types.ObjectId(userId),
        isDeleted: false,
    };

    if (filters.status) query.status = filters.status;

    const [turfs, total] = await Promise.all([
        TurfModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        TurfModel.countDocuments(query),
    ]);

    return {
        meta: {
            page,
            limit,
            total,
            totalPage: Math.ceil(total / limit),
        },
        data: turfs,
    };
};

const getTurfByIdOrSlug = async (idOrSlug: string, reqUser?: { _id?: string; role?: string }, meta?: { ip?: string; userAgent?: string; visitorId?: string }) => {
    const isObjectId = Types.ObjectId.isValid(idOrSlug);
    const filter: Record<string, any> = { isDeleted: false };

    if (isObjectId) {
        filter._id = new Types.ObjectId(idOrSlug);
    } else {
        filter.$or = [{ slug: idOrSlug.toLowerCase() }, { propertyNumber: idOrSlug }];
    }

    const turf = await TurfModel.findOne(filter)
        .populate("createdBy", "name email phone profileImage isVerified")
        .populate("owner", "name email phone profileImage isVerified")
        .lean();

    if (!turf) {
        throw new ApiError(httpStatus.NOT_FOUND, "Turf listing not found.");
    }

    const viewerId = reqUser?._id;
    const isOwnerOrAdmin = viewerId === (turf.createdBy as any)?._id?.toString() || reqUser?.role === "ADMIN";
    if (!isOwnerOrAdmin) {
        await TurfModel.updateOne({ _id: turf._id }, { $inc: { viewsCount: 1 } });
    }

    let isFavorite = false;
    if (viewerId) {
        lastViewedServices.recordLastViewed(viewerId, turf._id as Types.ObjectId, "TURF", "Turf");
        const fav = await FavoriteModel.exists({
            user: new Types.ObjectId(viewerId),
            listing: turf._id,
            isDeleted: false,
        });
        isFavorite = !!fav;
    }

    return { ...turf, isFavorite };
};

const updateTurf = async (id: string, userId: string, userRole: string, payload: Partial<ITurf> & { turfDetails?: Record<string, any> }, meta?: { ip?: string; userAgent?: string }) => {
    const turf = await TurfModel.findOne({ _id: id, isDeleted: false });
    if (!turf) {
        throw new ApiError(httpStatus.NOT_FOUND, "Turf listing not found.");
    }

    const isCreator = turf.createdBy.toString() === userId;
    const isAdmin = userRole === "ADMIN";
    if (!isCreator && !isAdmin) {
        throw new ApiError(httpStatus.FORBIDDEN, "You are not authorized to update this turf listing.");
    }

    const { turfDetails, ...restPayload } = payload;
    const flattened = { ...(turfDetails || {}), ...restPayload };

    if (flattened.title && flattened.title !== turf.title && !flattened.slug) {
        const baseSlug = flattened.title
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, "")
            .replace(/[\s_-]+/g, "-")
            .replace(/^-+|-+$/g, "");
        const randomSuffix = crypto.randomBytes(3).toString("hex");
        flattened.slug = `${baseSlug || "turf"}-${randomSuffix}`;
    }

    if (!isAdmin && turf.status === ListingStatus.REJECTED) {
        flattened.status = ListingStatus.PENDING_APPROVAL;
    }

    const updated = await TurfModel.findByIdAndUpdate(id, flattened, {
        new: true,
        runValidators: true,
    })
        .populate("createdBy", "name email phone profileImage")
        .populate("owner", "name email phone profileImage");

    if (updated) {
        turfRedis.invalidateTurf(updated._id.toString(), updated.slug, updated.propertyNumber);
    }

    activityLogServices.createActivityLog({
        user: new Types.ObjectId(userId),
        role: userRole,
        action: "UPDATE_LISTING",
        module: "TURF" as any,
        description: `Updated TURF listing: "${turf.title}"`,
        status: "SUCCESS",
        ipAddress: meta?.ip,
        userAgent: meta?.userAgent,
        metadata: { turfId: id },
    });

    return updated;
};

const updateAvailabilityStatus = async (id: string, userId: string, userRole: string, status: AvailabilityStatus) => {
    const turf = await TurfModel.findOne({ _id: id, isDeleted: false });
    if (!turf) {
        throw new ApiError(httpStatus.NOT_FOUND, "Turf listing not found.");
    }

    const isCreator = turf.createdBy.toString() === userId;
    const isAdmin = userRole === "ADMIN";
    if (!isCreator && !isAdmin) {
        throw new ApiError(httpStatus.FORBIDDEN, "You are not authorized to update availability status.");
    }

    turf.availabilityStatus = status;
    await turf.save();

    turfRedis.invalidateTurf(turf._id.toString(), turf.slug, turf.propertyNumber);
    return turf;
};

const deleteTurf = async (id: string, userId: string, userRole: string, meta?: { ip?: string; userAgent?: string }) => {
    const turf = await TurfModel.findOne({ _id: id, isDeleted: false });
    if (!turf) {
        throw new ApiError(httpStatus.NOT_FOUND, "Turf listing not found.");
    }

    const isCreator = turf.createdBy.toString() === userId;
    const isAdmin = userRole === "ADMIN";
    if (!isCreator && !isAdmin) {
        throw new ApiError(httpStatus.FORBIDDEN, "You are not authorized to delete this turf listing.");
    }

    turf.isDeleted = true;
    turf.status = ListingStatus.INACTIVE;
    await turf.save();

    turfRedis.invalidateTurf(turf._id.toString(), turf.slug, turf.propertyNumber);

    activityLogServices.createActivityLog({
        user: new Types.ObjectId(userId),
        role: userRole,
        action: "DELETE_LISTING",
        module: "TURF" as any,
        description: `Soft deleted TURF listing: "${turf.title}"`,
        status: "SUCCESS",
        ipAddress: meta?.ip,
        userAgent: meta?.userAgent,
        metadata: { turfId: id },
    });

    return { message: "Turf listing deleted successfully." };
};

const approveOrRejectTurf = async (
    id: string,
    adminId: string,
    payload: { action: "APPROVE" | "REJECT"; rejectionReason?: string },
    meta?: { ip?: string; userAgent?: string }
) => {
    const turf = await TurfModel.findOne({ _id: id, isDeleted: false });
    if (!turf) {
        throw new ApiError(httpStatus.NOT_FOUND, "Turf listing not found.");
    }

    const isApprove = payload.action === "APPROVE";
    turf.status = isApprove ? ListingStatus.ACTIVE : ListingStatus.REJECTED;
    turf.approvedBy = new Types.ObjectId(adminId);
    turf.approvedAt = new Date();

    if (isApprove) {
        turf.publishedAt = turf.publishedAt || new Date();
        turf.rejectionReason = undefined;
    } else {
        turf.rejectionReason = payload.rejectionReason || "Listing rejected by moderation team.";
    }

    await turf.save();
    turfRedis.invalidateTurf(turf._id.toString(), turf.slug, turf.propertyNumber);

    notificationServices.createNotification({
        recipient: turf.createdBy,
        sender: new Types.ObjectId(adminId),
        title: isApprove ? "Turf Listing Approved!" : "Turf Listing Rejected",
        message: isApprove
            ? `Your turf listing "${turf.title}" has been reviewed and approved.`
            : `Your turf listing "${turf.title}" was rejected: ${turf.rejectionReason}`,
        type: isApprove ? "LISTING_APPROVED" as any : "LISTING_REJECTED" as any,
        data: { turfId: turf._id.toString() },
    }).catch((err) => console.error("⚠️ [Notification Error]:", err));

    activityLogServices.createActivityLog({
        user: new Types.ObjectId(adminId),
        role: "ADMIN",
        action: "MODERATE_LISTING",
        module: "TURF" as any,
        description: `${isApprove ? "Approved" : "Rejected"} TURF listing: "${turf.title}"`,
        status: "SUCCESS",
        ipAddress: meta?.ip,
        userAgent: meta?.userAgent,
        metadata: { turfId: id, status: turf.status, rejectionReason: turf.rejectionReason },
    });

    return turf;
};

const toggleFeatureStatus = async (id: string) => {
    const turf = await TurfModel.findOne({ _id: id, isDeleted: false });
    if (!turf) {
        throw new ApiError(httpStatus.NOT_FOUND, "Turf listing not found.");
    }

    turf.isFeatured = !turf.isFeatured;
    await turf.save();

    turfRedis.invalidateTurf(turf._id.toString(), turf.slug, turf.propertyNumber);
    return turf;
};

const toggleVerification = async (id: string) => {
    const turf = await TurfModel.findOne({ _id: id, isDeleted: false });
    if (!turf) {
        throw new ApiError(httpStatus.NOT_FOUND, "Turf listing not found.");
    }

    turf.isVerified = !turf.isVerified;
    await turf.save();

    turfRedis.invalidateTurf(turf._id.toString(), turf.slug, turf.propertyNumber);
    return turf;
};

export const turfServices = {
    createTurf,
    getAllTurfs,
    getFeaturedTurfs,
    getTurfStats,
    getMyTurfs,
    getTurfByIdOrSlug,
    updateTurf,
    updateAvailabilityStatus,
    deleteTurf,
    approveOrRejectTurf,
    toggleFeatureStatus,
    toggleVerification,
};
