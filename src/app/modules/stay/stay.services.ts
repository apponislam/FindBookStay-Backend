import { Types } from "mongoose";
import httpStatus from "http-status";
import crypto from "crypto";
import ApiError from "../../../errors/ApiError";
import { IStay, ListingStatus, AvailabilityStatus, StayType, RoomType } from "./stay.interface";
import { StayModel } from "./stay.model";
import { FavoriteModel } from "../favorite/favorite.model";
import { UserModel } from "../auth/auth.model";
import { activityLogServices } from "../activityLog/activityLog.services";
import { stayRedis } from "./stay.redis";
import { notificationServices } from "../notification/notification.services";
import { lastViewedServices } from "../lastViewed/lastViewed.services";

const syncUserStayFlag = async (userId: Types.ObjectId) => {
    try {
        await UserModel.findByIdAndUpdate(userId, { hasStay: true });
    } catch (err) {
        console.error("⚠️ [User Stay Flag Sync Error]:", err);
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

const createStay = async (userId: string, userRole: string, payload: Partial<IStay> & { stayDetails?: Record<string, any> }, meta?: { ip?: string; userAgent?: string }) => {
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
        slug = `${baseSlug || "stay"}-${randomSuffix}`;
    }

    const { stayDetails, ...restPayload } = payload;
    const flattenedDetails = stayDetails || {};

    const stayData: Partial<IStay> = {
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

    const stay = await StayModel.create(stayData);
    await syncUserStayFlag(creatorId);

    activityLogServices.createActivityLog({
        user: creatorId,
        role: userRole,
        action: "CREATE_LISTING",
        module: "STAY" as any,
        description: `Created new STAY listing: "${stay.title}"`,
        status: "SUCCESS",
        ipAddress: meta?.ip,
        userAgent: meta?.userAgent,
        metadata: {
            stayId: stay._id,
            stayType: stay.stayType,
            price: stay.price,
            status: stay.status,
        },
    });

    stayRedis.invalidateStay(stay._id.toString(), stay.slug, stay.propertyNumber);
    return stay;
};

const getAllStays = async (filters: Record<string, any>, reqUser?: { _id?: string; role?: string }) => {
    const isAdmin = reqUser?.role === "ADMIN";
    const queryFingerprint = stayRedis.generateQueryFingerprint(filters);

    if (!isAdmin) {
        const cached = await stayRedis.getCachedSearch(queryFingerprint);
        if (cached) return cached;
    }

    const query: Record<string, any> = { isDeleted: false };

    if (!isAdmin) {
        query.status = ListingStatus.ACTIVE;
    } else if (filters.status) {
        query.status = filters.status;
    }

    if (filters.availabilityStatus) query.availabilityStatus = filters.availabilityStatus;
    if (filters.stayType) query.stayType = filters.stayType;
    if (filters.roomType) query.roomType = filters.roomType;

    if (filters.maxGuests !== undefined && filters.maxGuests !== "") {
        query.maxGuests = { $gte: Number(filters.maxGuests) };
    }
    if (filters.bedCount !== undefined && filters.bedCount !== "") {
        query.bedCount = { $gte: Number(filters.bedCount) };
    }

    const freeBreakfast = toBoolean(filters.freeBreakfast);
    if (freeBreakfast !== undefined) query.freeBreakfast = freeBreakfast;

    const childrenAllowed = toBoolean(filters.childrenAllowed);
    if (childrenAllowed !== undefined) query.childrenAllowed = childrenAllowed;

    const petsAllowed = toBoolean(filters.petsAllowed);
    if (petsAllowed !== undefined) query.petsAllowed = petsAllowed;

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

    const [stays, total] = await Promise.all([
        StayModel.find(query)
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .populate("createdBy", "name email phone profileImage")
            .populate("owner", "name email phone profileImage")
            .lean(),
        StayModel.countDocuments(query),
    ]);

    const result = {
        meta: {
            page,
            limit,
            total,
            totalPage: Math.ceil(total / limit),
        },
        data: stays,
    };

    if (!isAdmin) {
        await stayRedis.setCachedSearch(queryFingerprint, result);
    }

    return result;
};

const getFeaturedStays = async (limit: number = 8) => {
    const cached = await stayRedis.getCachedFeaturedStays(limit);
    if (cached) return cached;

    const stays = await StayModel.find({
        status: ListingStatus.ACTIVE,
        isFeatured: true,
        isDeleted: false,
    })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate("createdBy", "name email phone profileImage")
        .lean();

    await stayRedis.setCachedFeaturedStays(limit, stays);
    return stays;
};

const getStayStats = async () => {
    const cached = await stayRedis.getCachedStayStats();
    if (cached) return cached;

    const [total, active, pendingApproval] = await Promise.all([
        StayModel.countDocuments({ isDeleted: false }),
        StayModel.countDocuments({ status: ListingStatus.ACTIVE, isDeleted: false }),
        StayModel.countDocuments({ status: ListingStatus.PENDING_APPROVAL, isDeleted: false }),
    ]);

    const stats = {
        total,
        active,
        pendingApproval,
    };

    await stayRedis.setCachedStayStats(stats);
    return stats;
};

const getMyStays = async (userId: string, filters: Record<string, any>) => {
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 10));
    const skip = (page - 1) * limit;

    const query: Record<string, any> = {
        createdBy: new Types.ObjectId(userId),
        isDeleted: false,
    };

    if (filters.status) query.status = filters.status;

    const [stays, total] = await Promise.all([
        StayModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        StayModel.countDocuments(query),
    ]);

    return {
        meta: {
            page,
            limit,
            total,
            totalPage: Math.ceil(total / limit),
        },
        data: stays,
    };
};

const getStayByIdOrSlug = async (idOrSlug: string, reqUser?: { _id?: string; role?: string }, meta?: { ip?: string; userAgent?: string; visitorId?: string }) => {
    const isObjectId = Types.ObjectId.isValid(idOrSlug);
    const filter: Record<string, any> = { isDeleted: false };

    if (isObjectId) {
        filter._id = new Types.ObjectId(idOrSlug);
    } else {
        filter.$or = [{ slug: idOrSlug.toLowerCase() }, { propertyNumber: idOrSlug }];
    }

    const stay = await StayModel.findOne(filter)
        .populate("createdBy", "name email phone profileImage isVerified")
        .populate("owner", "name email phone profileImage isVerified")
        .lean();

    if (!stay) {
        throw new ApiError(httpStatus.NOT_FOUND, "Stay listing not found.");
    }

    const viewerId = reqUser?._id;
    const isOwnerOrAdmin = viewerId === (stay.createdBy as any)?._id?.toString() || reqUser?.role === "ADMIN";
    if (!isOwnerOrAdmin) {
        await StayModel.updateOne({ _id: stay._id }, { $inc: { viewsCount: 1 } });
    }

    let isFavorite = false;
    if (viewerId) {
        lastViewedServices.recordLastViewed(viewerId, stay._id as Types.ObjectId, "STAY", "Stay");
        const fav = await FavoriteModel.exists({
            user: new Types.ObjectId(viewerId),
            listing: stay._id,
            isDeleted: false,
        });
        isFavorite = !!fav;
    }

    return { ...stay, isFavorite };
};

const updateStay = async (id: string, userId: string, userRole: string, payload: Partial<IStay> & { stayDetails?: Record<string, any> }, meta?: { ip?: string; userAgent?: string }) => {
    const stay = await StayModel.findOne({ _id: id, isDeleted: false });
    if (!stay) {
        throw new ApiError(httpStatus.NOT_FOUND, "Stay listing not found.");
    }

    const isCreator = stay.createdBy.toString() === userId;
    const isAdmin = userRole === "ADMIN";
    if (!isCreator && !isAdmin) {
        throw new ApiError(httpStatus.FORBIDDEN, "You are not authorized to update this stay listing.");
    }

    const { stayDetails, ...restPayload } = payload;
    const flattened = { ...(stayDetails || {}), ...restPayload };

    if (flattened.title && flattened.title !== stay.title && !flattened.slug) {
        const baseSlug = flattened.title
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, "")
            .replace(/[\s_-]+/g, "-")
            .replace(/^-+|-+$/g, "");
        const randomSuffix = crypto.randomBytes(3).toString("hex");
        flattened.slug = `${baseSlug || "stay"}-${randomSuffix}`;
    }

    if (!isAdmin && stay.status === ListingStatus.REJECTED) {
        flattened.status = ListingStatus.PENDING_APPROVAL;
    }

    const updated = await StayModel.findByIdAndUpdate(id, flattened, {
        new: true,
        runValidators: true,
    })
        .populate("createdBy", "name email phone profileImage")
        .populate("owner", "name email phone profileImage");

    if (updated) {
        stayRedis.invalidateStay(updated._id.toString(), updated.slug, updated.propertyNumber);
    }

    activityLogServices.createActivityLog({
        user: new Types.ObjectId(userId),
        role: userRole,
        action: "UPDATE_LISTING",
        module: "STAY" as any,
        description: `Updated STAY listing: "${stay.title}"`,
        status: "SUCCESS",
        ipAddress: meta?.ip,
        userAgent: meta?.userAgent,
        metadata: { stayId: id },
    });

    return updated;
};

const updateAvailabilityStatus = async (id: string, userId: string, userRole: string, status: AvailabilityStatus) => {
    const stay = await StayModel.findOne({ _id: id, isDeleted: false });
    if (!stay) {
        throw new ApiError(httpStatus.NOT_FOUND, "Stay listing not found.");
    }

    const isCreator = stay.createdBy.toString() === userId;
    const isAdmin = userRole === "ADMIN";
    if (!isCreator && !isAdmin) {
        throw new ApiError(httpStatus.FORBIDDEN, "You are not authorized to update availability status.");
    }

    stay.availabilityStatus = status;
    await stay.save();

    stayRedis.invalidateStay(stay._id.toString(), stay.slug, stay.propertyNumber);
    return stay;
};

const deleteStay = async (id: string, userId: string, userRole: string, meta?: { ip?: string; userAgent?: string }) => {
    const stay = await StayModel.findOne({ _id: id, isDeleted: false });
    if (!stay) {
        throw new ApiError(httpStatus.NOT_FOUND, "Stay listing not found.");
    }

    const isCreator = stay.createdBy.toString() === userId;
    const isAdmin = userRole === "ADMIN";
    if (!isCreator && !isAdmin) {
        throw new ApiError(httpStatus.FORBIDDEN, "You are not authorized to delete this stay listing.");
    }

    stay.isDeleted = true;
    stay.status = ListingStatus.INACTIVE;
    await stay.save();

    stayRedis.invalidateStay(stay._id.toString(), stay.slug, stay.propertyNumber);

    activityLogServices.createActivityLog({
        user: new Types.ObjectId(userId),
        role: userRole,
        action: "DELETE_LISTING",
        module: "STAY" as any,
        description: `Soft deleted STAY listing: "${stay.title}"`,
        status: "SUCCESS",
        ipAddress: meta?.ip,
        userAgent: meta?.userAgent,
        metadata: { stayId: id },
    });

    return { message: "Stay listing deleted successfully." };
};

const approveOrRejectStay = async (
    id: string,
    adminId: string,
    payload: { action: "APPROVE" | "REJECT"; rejectionReason?: string },
    meta?: { ip?: string; userAgent?: string }
) => {
    const stay = await StayModel.findOne({ _id: id, isDeleted: false });
    if (!stay) {
        throw new ApiError(httpStatus.NOT_FOUND, "Stay listing not found.");
    }

    const isApprove = payload.action === "APPROVE";
    stay.status = isApprove ? ListingStatus.ACTIVE : ListingStatus.REJECTED;
    stay.approvedBy = new Types.ObjectId(adminId);
    stay.approvedAt = new Date();

    if (isApprove) {
        stay.publishedAt = stay.publishedAt || new Date();
        stay.rejectionReason = undefined;
    } else {
        stay.rejectionReason = payload.rejectionReason || "Listing rejected by moderation team.";
    }

    await stay.save();
    stayRedis.invalidateStay(stay._id.toString(), stay.slug, stay.propertyNumber);

    notificationServices.createNotification({
        recipient: stay.createdBy,
        sender: new Types.ObjectId(adminId),
        title: isApprove ? "Stay Listing Approved!" : "Stay Listing Rejected",
        message: isApprove
            ? `Your stay listing "${stay.title}" has been reviewed and approved.`
            : `Your stay listing "${stay.title}" was rejected: ${stay.rejectionReason}`,
        type: isApprove ? "LISTING_APPROVED" as any : "LISTING_REJECTED" as any,
        data: { stayId: stay._id.toString() },
    }).catch((err) => console.error("⚠️ [Notification Error]:", err));

    activityLogServices.createActivityLog({
        user: new Types.ObjectId(adminId),
        role: "ADMIN",
        action: "MODERATE_LISTING",
        module: "STAY" as any,
        description: `${isApprove ? "Approved" : "Rejected"} STAY listing: "${stay.title}"`,
        status: "SUCCESS",
        ipAddress: meta?.ip,
        userAgent: meta?.userAgent,
        metadata: { stayId: id, status: stay.status, rejectionReason: stay.rejectionReason },
    });

    return stay;
};

const toggleFeatureStatus = async (id: string) => {
    const stay = await StayModel.findOne({ _id: id, isDeleted: false });
    if (!stay) {
        throw new ApiError(httpStatus.NOT_FOUND, "Stay listing not found.");
    }

    stay.isFeatured = !stay.isFeatured;
    await stay.save();

    stayRedis.invalidateStay(stay._id.toString(), stay.slug, stay.propertyNumber);
    return stay;
};

const toggleVerification = async (id: string) => {
    const stay = await StayModel.findOne({ _id: id, isDeleted: false });
    if (!stay) {
        throw new ApiError(httpStatus.NOT_FOUND, "Stay listing not found.");
    }

    stay.isVerified = !stay.isVerified;
    await stay.save();

    stayRedis.invalidateStay(stay._id.toString(), stay.slug, stay.propertyNumber);
    return stay;
};

export const stayServices = {
    createStay,
    getAllStays,
    getFeaturedStays,
    getStayStats,
    getMyStays,
    getStayByIdOrSlug,
    updateStay,
    updateAvailabilityStatus,
    deleteStay,
    approveOrRejectStay,
    toggleFeatureStatus,
    toggleVerification,
};
