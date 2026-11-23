import { Types } from "mongoose";
import httpStatus from "http-status";
import crypto from "crypto";
import ApiError from "../../../errors/ApiError";
import { IHome, ListingStatus, AvailabilityStatus, RentType, TargetTenant, HomeSubCategory } from "./home.interface";
import { HomeModel } from "./home.model";
import { FavoriteModel } from "../favorite/favorite.model";
import { UserModel } from "../auth/auth.model";
import { activityLogServices } from "../activityLog/activityLog.services";
import { homeRedis } from "./home.redis";
import { notificationServices } from "../notification/notification.services";
import { lastViewedServices } from "../lastViewed/lastViewed.services";

const syncUserHomeFlag = async (userId: Types.ObjectId) => {
    try {
        await UserModel.findByIdAndUpdate(userId, { hasHome: true });
    } catch (err) {
        console.error("⚠️ [User Home Flag Sync Error]:", err);
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

const createHome = async (userId: string, userRole: string, payload: Partial<IHome> & { homeDetails?: Record<string, any> }, meta?: { ip?: string; userAgent?: string }) => {
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
        slug = `${baseSlug || "home"}-${randomSuffix}`;
    }

    // Flatten any nested homeDetails if passed by client
    const { homeDetails, ...restPayload } = payload;
    const flattenedDetails = homeDetails || {};

    const homeData: Partial<IHome> = {
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

    const home = await HomeModel.create(homeData);
    await syncUserHomeFlag(creatorId);

    activityLogServices.createActivityLog({
        user: creatorId,
        role: userRole,
        action: "CREATE_LISTING",
        module: "HOME" as any,
        description: `Created new HOME listing: "${home.title}"`,
        status: "SUCCESS",
        ipAddress: meta?.ip,
        userAgent: meta?.userAgent,
        metadata: {
            homeId: home._id,
            subCategory: home.subCategory,
            price: home.price,
            status: home.status,
        },
    });

    homeRedis.invalidateHome(home._id.toString(), home.slug, home.propertyNumber);
    return home;
};

const getAllHomes = async (filters: Record<string, any>, reqUser?: { _id?: string; role?: string }) => {
    const isAdmin = reqUser?.role === "ADMIN";
    const queryFingerprint = homeRedis.generateQueryFingerprint(filters);

    if (!isAdmin) {
        const cached = await homeRedis.getCachedSearch(queryFingerprint);
        if (cached) return cached;
    }

    const query: Record<string, any> = { isDeleted: false };

    if (!isAdmin) {
        query.status = ListingStatus.ACTIVE;
    } else if (filters.status) {
        query.status = filters.status;
    }

    if (filters.availabilityStatus) query.availabilityStatus = filters.availabilityStatus;
    if (filters.subCategory) query.subCategory = filters.subCategory;
    if (filters.rentType) query.rentType = filters.rentType;
    if (filters.targetTenant) query.targetTenant = filters.targetTenant;

    if (filters.bedrooms !== undefined && filters.bedrooms !== "") {
        query.bedrooms = Number(filters.bedrooms);
    }
    if (filters.bathrooms !== undefined && filters.bathrooms !== "") {
        query.bathrooms = Number(filters.bathrooms);
    }

    const isFurnished = toBoolean(filters.isFurnished);
    if (isFurnished !== undefined) query.isFurnished = isFurnished;

    const attachedBath = toBoolean(filters.attachedBath);
    if (attachedBath !== undefined) query.attachedBath = attachedBath;

    const mealSystemAvailable = toBoolean(filters.mealSystemAvailable);
    if (mealSystemAvailable !== undefined) query.mealSystemAvailable = mealSystemAvailable;

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

    const [homes, total] = await Promise.all([
        HomeModel.find(query)
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .populate("createdBy", "name email phone profileImage")
            .populate("owner", "name email phone profileImage")
            .lean(),
        HomeModel.countDocuments(query),
    ]);

    const result = {
        meta: {
            page,
            limit,
            total,
            totalPage: Math.ceil(total / limit),
        },
        data: homes,
    };

    if (!isAdmin) {
        await homeRedis.setCachedSearch(queryFingerprint, result);
    }

    return result;
};

const getFeaturedHomes = async (limit: number = 8) => {
    const cached = await homeRedis.getCachedFeaturedHomes(limit);
    if (cached) return cached;

    const homes = await HomeModel.find({
        status: ListingStatus.ACTIVE,
        isFeatured: true,
        isDeleted: false,
    })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate("createdBy", "name email phone profileImage")
        .lean();

    await homeRedis.setCachedFeaturedHomes(limit, homes);
    return homes;
};

const getHomeStats = async () => {
    const cached = await homeRedis.getCachedHomeStats();
    if (cached) return cached;

    const [total, active, pendingApproval] = await Promise.all([
        HomeModel.countDocuments({ isDeleted: false }),
        HomeModel.countDocuments({ status: ListingStatus.ACTIVE, isDeleted: false }),
        HomeModel.countDocuments({ status: ListingStatus.PENDING_APPROVAL, isDeleted: false }),
    ]);

    const stats = {
        total,
        active,
        pendingApproval,
    };

    await homeRedis.setCachedHomeStats(stats);
    return stats;
};

const getMyHomes = async (userId: string, filters: Record<string, any>) => {
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 10));
    const skip = (page - 1) * limit;

    const query: Record<string, any> = {
        createdBy: new Types.ObjectId(userId),
        isDeleted: false,
    };

    if (filters.status) query.status = filters.status;

    const [homes, total] = await Promise.all([
        HomeModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        HomeModel.countDocuments(query),
    ]);

    return {
        meta: {
            page,
            limit,
            total,
            totalPage: Math.ceil(total / limit),
        },
        data: homes,
    };
};

const getHomeByIdOrSlug = async (idOrSlug: string, reqUser?: { _id?: string; role?: string }, meta?: { ip?: string; userAgent?: string; visitorId?: string }) => {
    const isObjectId = Types.ObjectId.isValid(idOrSlug);
    const filter: Record<string, any> = { isDeleted: false };

    if (isObjectId) {
        filter._id = new Types.ObjectId(idOrSlug);
    } else {
        filter.$or = [{ slug: idOrSlug.toLowerCase() }, { propertyNumber: idOrSlug }];
    }

    const home = await HomeModel.findOne(filter)
        .populate("createdBy", "name email phone profileImage isVerified")
        .populate("owner", "name email phone profileImage isVerified")
        .lean();

    if (!home) {
        throw new ApiError(httpStatus.NOT_FOUND, "Home listing not found.");
    }

    // Atomically increment views count if viewer is not the creator or admin
    const viewerId = reqUser?._id;
    const isOwnerOrAdmin = viewerId === (home.createdBy as any)?._id?.toString() || reqUser?.role === "ADMIN";
    if (!isOwnerOrAdmin) {
        await HomeModel.updateOne({ _id: home._id }, { $inc: { viewsCount: 1 } });
    }

    let isFavorite = false;
    if (viewerId) {
        lastViewedServices.recordLastViewed(viewerId, home._id as Types.ObjectId, "HOME", "Home");
        const fav = await FavoriteModel.exists({
            user: new Types.ObjectId(viewerId),
            listing: home._id,
            isDeleted: false,
        });
        isFavorite = !!fav;
    }

    return { ...home, isFavorite };
};

const updateHome = async (id: string, userId: string, userRole: string, payload: Partial<IHome> & { homeDetails?: Record<string, any> }, meta?: { ip?: string; userAgent?: string }) => {
    const home = await HomeModel.findOne({ _id: id, isDeleted: false });
    if (!home) {
        throw new ApiError(httpStatus.NOT_FOUND, "Home listing not found.");
    }

    const isCreator = home.createdBy.toString() === userId;
    const isAdmin = userRole === "ADMIN";
    if (!isCreator && !isAdmin) {
        throw new ApiError(httpStatus.FORBIDDEN, "You are not authorized to update this home listing.");
    }

    const { homeDetails, ...restPayload } = payload;
    const flattened = { ...(homeDetails || {}), ...restPayload };

    if (flattened.title && flattened.title !== home.title && !flattened.slug) {
        const baseSlug = flattened.title
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, "")
            .replace(/[\s_-]+/g, "-")
            .replace(/^-+|-+$/g, "");
        const randomSuffix = crypto.randomBytes(3).toString("hex");
        flattened.slug = `${baseSlug || "home"}-${randomSuffix}`;
    }

    if (!isAdmin && home.status === ListingStatus.REJECTED) {
        flattened.status = ListingStatus.PENDING_APPROVAL;
    }

    const updated = await HomeModel.findByIdAndUpdate(id, flattened, {
        new: true,
        runValidators: true,
    })
        .populate("createdBy", "name email phone profileImage")
        .populate("owner", "name email phone profileImage");

    if (updated) {
        homeRedis.invalidateHome(updated._id.toString(), updated.slug, updated.propertyNumber);
    }

    activityLogServices.createActivityLog({
        user: new Types.ObjectId(userId),
        role: userRole,
        action: "UPDATE_LISTING",
        module: "HOME" as any,
        description: `Updated HOME listing: "${home.title}"`,
        status: "SUCCESS",
        ipAddress: meta?.ip,
        userAgent: meta?.userAgent,
        metadata: { homeId: id },
    });

    return updated;
};

const updateAvailabilityStatus = async (id: string, userId: string, userRole: string, status: AvailabilityStatus) => {
    const home = await HomeModel.findOne({ _id: id, isDeleted: false });
    if (!home) {
        throw new ApiError(httpStatus.NOT_FOUND, "Home listing not found.");
    }

    const isCreator = home.createdBy.toString() === userId;
    const isAdmin = userRole === "ADMIN";
    if (!isCreator && !isAdmin) {
        throw new ApiError(httpStatus.FORBIDDEN, "You are not authorized to update availability status.");
    }

    home.availabilityStatus = status;
    await home.save();

    homeRedis.invalidateHome(home._id.toString(), home.slug, home.propertyNumber);
    return home;
};

const deleteHome = async (id: string, userId: string, userRole: string, meta?: { ip?: string; userAgent?: string }) => {
    const home = await HomeModel.findOne({ _id: id, isDeleted: false });
    if (!home) {
        throw new ApiError(httpStatus.NOT_FOUND, "Home listing not found.");
    }

    const isCreator = home.createdBy.toString() === userId;
    const isAdmin = userRole === "ADMIN";
    if (!isCreator && !isAdmin) {
        throw new ApiError(httpStatus.FORBIDDEN, "You are not authorized to delete this home listing.");
    }

    home.isDeleted = true;
    home.status = ListingStatus.INACTIVE;
    await home.save();

    homeRedis.invalidateHome(home._id.toString(), home.slug, home.propertyNumber);

    activityLogServices.createActivityLog({
        user: new Types.ObjectId(userId),
        role: userRole,
        action: "DELETE_LISTING",
        module: "HOME" as any,
        description: `Soft deleted HOME listing: "${home.title}"`,
        status: "SUCCESS",
        ipAddress: meta?.ip,
        userAgent: meta?.userAgent,
        metadata: { homeId: id },
    });

    return { message: "Home listing deleted successfully." };
};

const approveOrRejectHome = async (
    id: string,
    adminId: string,
    payload: { action: "APPROVE" | "REJECT"; rejectionReason?: string },
    meta?: { ip?: string; userAgent?: string }
) => {
    const home = await HomeModel.findOne({ _id: id, isDeleted: false });
    if (!home) {
        throw new ApiError(httpStatus.NOT_FOUND, "Home listing not found.");
    }

    const isApprove = payload.action === "APPROVE";
    home.status = isApprove ? ListingStatus.ACTIVE : ListingStatus.REJECTED;
    home.approvedBy = new Types.ObjectId(adminId);
    home.approvedAt = new Date();

    if (isApprove) {
        home.publishedAt = home.publishedAt || new Date();
        home.rejectionReason = undefined;
    } else {
        home.rejectionReason = payload.rejectionReason || "Listing rejected by moderation team.";
    }

    await home.save();
    homeRedis.invalidateHome(home._id.toString(), home.slug, home.propertyNumber);

    notificationServices.createNotification({
        recipient: home.createdBy,
        sender: new Types.ObjectId(adminId),
        title: isApprove ? "Home Listing Approved!" : "Home Listing Rejected",
        message: isApprove
            ? `Your home listing "${home.title}" has been reviewed and approved.`
            : `Your home listing "${home.title}" was rejected: ${home.rejectionReason}`,
        type: isApprove ? "LISTING_APPROVED" as any : "LISTING_REJECTED" as any,
        data: { homeId: home._id.toString() },
    }).catch((err) => console.error("⚠️ [Notification Error]:", err));

    activityLogServices.createActivityLog({
        user: new Types.ObjectId(adminId),
        role: "ADMIN",
        action: "MODERATE_LISTING",
        module: "HOME" as any,
        description: `${isApprove ? "Approved" : "Rejected"} HOME listing: "${home.title}"`,
        status: "SUCCESS",
        ipAddress: meta?.ip,
        userAgent: meta?.userAgent,
        metadata: { homeId: id, status: home.status, rejectionReason: home.rejectionReason },
    });

    return home;
};

const toggleFeatureStatus = async (id: string) => {
    const home = await HomeModel.findOne({ _id: id, isDeleted: false });
    if (!home) {
        throw new ApiError(httpStatus.NOT_FOUND, "Home listing not found.");
    }

    home.isFeatured = !home.isFeatured;
    await home.save();

    homeRedis.invalidateHome(home._id.toString(), home.slug, home.propertyNumber);
    return home;
};

const toggleVerification = async (id: string) => {
    const home = await HomeModel.findOne({ _id: id, isDeleted: false });
    if (!home) {
        throw new ApiError(httpStatus.NOT_FOUND, "Home listing not found.");
    }

    home.isVerified = !home.isVerified;
    await home.save();

    homeRedis.invalidateHome(home._id.toString(), home.slug, home.propertyNumber);
    return home;
};

export const homeServices = {
    createHome,
    getAllHomes,
    getFeaturedHomes,
    getHomeStats,
    getMyHomes,
    getHomeByIdOrSlug,
    updateHome,
    updateAvailabilityStatus,
    deleteHome,
    approveOrRejectHome,
    toggleFeatureStatus,
    toggleVerification,
};
