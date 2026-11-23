import { Types, Model } from "mongoose";
import httpStatus from "http-status";
import ApiError from "../../../errors/ApiError";
import { FavoriteModel } from "./favorite.model";
import { FavoriteItemModel } from "./favorite.interface";
import { HomeModel } from "../home/home.model";
import { homeRedis } from "../home/home.redis";
import { StayModel } from "../stay/stay.model";
import { stayRedis } from "../stay/stay.redis";
import { TurfModel } from "../turf/turf.model";
import { turfRedis } from "../turf/turf.redis";
import { PropertyModel } from "../property/property.model";
import { propertyRedis } from "../property/property.redis";
import { ListingCategory } from "../../enums/listingCategory";

/**
 * 1-Click Toggle favorite listing (Add / Soft-delete)
 * Atomically updates favoritesCount & bookmarksCount on the corresponding vertical model
 */
const toggleFavorite = async (
    userId: string,
    listingId: string,
    explicitCategory?: ListingCategory | string,
    explicitItemModel?: FavoriteItemModel
) => {
    if (!Types.ObjectId.isValid(listingId)) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Invalid listing ID format.");
    }

    const targetListingId = new Types.ObjectId(listingId);
    const targetUserId = new Types.ObjectId(userId);

    let targetDoc: any = null;
    let targetModel: Model<any> = HomeModel;
    let itemModel: FavoriteItemModel = explicitItemModel || "Home";
    let category: ListingCategory = ListingCategory.HOME;
    let invalidateCache = () => {};

    // 1. If explicit category or model provided, try targeted lookup first
    if (explicitItemModel === "Home" || explicitCategory === "HOME") {
        targetDoc = await HomeModel.findOne({ _id: targetListingId, isDeleted: false });
        if (targetDoc) {
            targetModel = HomeModel;
            itemModel = "Home";
            category = ListingCategory.HOME;
            invalidateCache = () => homeRedis.invalidateHome(listingId, targetDoc.slug, targetDoc.propertyNumber);
        }
    } else if (explicitItemModel === "Stay" || explicitCategory === "STAY") {
        targetDoc = await StayModel.findOne({ _id: targetListingId, isDeleted: false });
        if (targetDoc) {
            targetModel = StayModel;
            itemModel = "Stay";
            category = ListingCategory.STAY;
            invalidateCache = () => stayRedis.invalidateStay(listingId, targetDoc.slug, targetDoc.propertyNumber);
        }
    } else if (explicitItemModel === "Turf" || explicitCategory === "TURF") {
        targetDoc = await TurfModel.findOne({ _id: targetListingId, isDeleted: false });
        if (targetDoc) {
            targetModel = TurfModel;
            itemModel = "Turf";
            category = ListingCategory.TURF;
            invalidateCache = () => turfRedis.invalidateTurf(listingId, targetDoc.slug, targetDoc.propertyNumber);
        }
    } else if (explicitItemModel === "Property" || explicitCategory === "PROPERTY") {
        targetDoc = await PropertyModel.findOne({ _id: targetListingId, isDeleted: false });
        if (targetDoc) {
            targetModel = PropertyModel;
            itemModel = "Property";
            category = ListingCategory.PROPERTY;
            invalidateCache = () => propertyRedis.invalidateProperty(listingId, targetDoc.slug, targetDoc.propertyNumber);
        }
    }

    // 2. If not found via hint or hint not provided, resolve across all collections in parallel
    if (!targetDoc) {
        const [home, stay, turf, property] = await Promise.all([
            HomeModel.findOne({ _id: targetListingId, isDeleted: false }),
            StayModel.findOne({ _id: targetListingId, isDeleted: false }),
            TurfModel.findOne({ _id: targetListingId, isDeleted: false }),
            PropertyModel.findOne({ _id: targetListingId, isDeleted: false }),
        ]);

        if (home) {
            targetDoc = home;
            targetModel = HomeModel;
            itemModel = "Home";
            category = ListingCategory.HOME;
            invalidateCache = () => homeRedis.invalidateHome(listingId, home.slug, home.propertyNumber);
        } else if (stay) {
            targetDoc = stay;
            targetModel = StayModel;
            itemModel = "Stay";
            category = ListingCategory.STAY;
            invalidateCache = () => stayRedis.invalidateStay(listingId, stay.slug, stay.propertyNumber);
        } else if (turf) {
            targetDoc = turf;
            targetModel = TurfModel;
            itemModel = "Turf";
            category = ListingCategory.TURF;
            invalidateCache = () => turfRedis.invalidateTurf(listingId, turf.slug, turf.propertyNumber);
        } else if (property) {
            targetDoc = property;
            targetModel = PropertyModel;
            itemModel = "Property";
            category = ListingCategory.PROPERTY;
            invalidateCache = () => propertyRedis.invalidateProperty(listingId, property.slug, property.propertyNumber);
        }
    }

    if (!targetDoc) {
        throw new ApiError(httpStatus.NOT_FOUND, "The listing you are trying to favorite does not exist.");
    }

    const existing = await FavoriteModel.findOne({
        user: targetUserId,
        listing: targetListingId,
    });

    if (existing && !existing.isDeleted) {
        // Soft delete favorite
        existing.isDeleted = true;
        await existing.save();

        // Atomically decrement favorites/bookmarks count on the respective model
        await targetModel.updateOne(
            { _id: targetListingId, favoritesCount: { $gt: 0 } },
            { $inc: { favoritesCount: -1, bookmarksCount: -1 } }
        );
        invalidateCache();

        return {
            isFavorite: false,
            message: "Listing removed from favorites.",
            data: null,
        };
    } else if (existing && existing.isDeleted) {
        // Restore previously soft-deleted favorite
        existing.isDeleted = false;
        existing.category = category;
        existing.itemModel = itemModel;
        await existing.save();

        // Atomically increment favorites/bookmarks count on the respective model
        await targetModel.updateOne(
            { _id: targetListingId },
            { $inc: { favoritesCount: 1, bookmarksCount: 1 } }
        );
        invalidateCache();

        return {
            isFavorite: true,
            message: "Listing saved to favorites successfully.",
            data: existing,
        };
    } else {
        // Create new favorite record
        const favorite = await FavoriteModel.create({
            user: targetUserId,
            listing: targetListingId,
            itemModel,
            category,
            isDeleted: false,
        });

        // Atomically increment favorites/bookmarks count on the respective model
        await targetModel.updateOne(
            { _id: targetListingId },
            { $inc: { favoritesCount: 1, bookmarksCount: 1 } }
        );
        invalidateCache();

        await favorite.populate("listing", "title slug propertyNumber featuredImage category subCategory price originalPrice priceUnit currency location ratingAverage totalReviews availabilityStatus isVerified favoritesCount bookmarksCount");

        return {
            isFavorite: true,
            message: "Listing saved to favorites successfully.",
            data: favorite,
        };
    }
};

/**
 * Get all active favorite listings saved by current user
 */
const getMyFavorites = async (userId: string, query: Record<string, any>) => {
    const targetUserId = new Types.ObjectId(userId);
    const filter: Record<string, any> = { user: targetUserId, isDeleted: false };

    if (query.category) {
        filter.category = query.category;
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 12));
    const skip = (page - 1) * limit;

    const [favorites, total, categoryCounts] = await Promise.all([
        FavoriteModel.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate({
                path: "listing",
                match: { isDeleted: false },
                select: "title slug propertyNumber featuredImage images category subCategory price originalPrice priceUnit currency location ratingAverage totalReviews availabilityStatus isVerified favoritesCount bookmarksCount",
            })
            .lean(),
        FavoriteModel.countDocuments(filter),
        FavoriteModel.aggregate([
            { $match: { user: targetUserId, isDeleted: false } },
            { $group: { _id: "$category", count: { $sum: 1 } } },
        ]),
    ]);

    // Filter out items where the listing was deleted
    const activeFavorites = favorites.filter((fav) => fav.listing !== null);

    const counts: Record<string, number> = {
        all: total,
        HOME: 0,
        STAY: 0,
        TURF: 0,
        PROPERTY: 0,
    };
    categoryCounts.forEach((c) => {
        if (c._id in counts) {
            counts[c._id] = c.count;
        }
    });

    const totalPages = Math.ceil(total / limit) || 1;

    return {
        meta: {
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
            counts,
        },
        data: activeFavorites,
    };
};

/**
 * Update private note on a saved listing
 */
const updateFavoriteNote = async (userId: string, listingId: string, note: string) => {
    if (!Types.ObjectId.isValid(listingId)) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Invalid listing ID format.");
    }

    const favorite = await FavoriteModel.findOne({
        user: new Types.ObjectId(userId),
        listing: new Types.ObjectId(listingId),
        isDeleted: false,
    });

    if (!favorite) {
        throw new ApiError(httpStatus.NOT_FOUND, "This listing was not found in your active favorites.");
    }

    favorite.note = note;
    await favorite.save();

    return favorite;
};

export const favoriteServices = {
    toggleFavorite,
    getMyFavorites,
    updateFavoriteNote,
};
