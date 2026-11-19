import { Types } from "mongoose";
import httpStatus from "http-status";
import ApiError from "../../../errors/ApiError";
import { FavoriteModel } from "./favorite.model";
import { ListingModel } from "../listing/listing.model";

/**
 * 1-Click Toggle favorite listing (Add / Soft-delete)
 * Atomically updates favoritesCount & bookmarksCount on the listing
 */
const toggleFavorite = async (userId: string, listingId: string) => {
    if (!Types.ObjectId.isValid(listingId)) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Invalid listing ID format.");
    }

    const targetListingId = new Types.ObjectId(listingId);
    const targetUserId = new Types.ObjectId(userId);

    // Verify listing exists and is not deleted
    const listing = await ListingModel.findOne({ _id: targetListingId, isDeleted: false });
    if (!listing) {
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

        // Atomically decrement favorites/bookmarks count on listing
        await ListingModel.updateOne({ _id: targetListingId, favoritesCount: { $gt: 0 } }, { $inc: { favoritesCount: -1, bookmarksCount: -1 } });

        return {
            isFavorite: false,
            message: "Listing removed from favorites.",
            data: null,
        };
    } else if (existing && existing.isDeleted) {
        // Restore previously soft-deleted favorite
        existing.isDeleted = false;
        existing.category = listing.category;
        await existing.save();

        // Atomically increment favorites/bookmarks count on listing
        await ListingModel.updateOne({ _id: targetListingId }, { $inc: { favoritesCount: 1, bookmarksCount: 1 } });

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
            category: listing.category,
            isDeleted: false,
        });

        // Atomically increment favorites/bookmarks count on listing
        await ListingModel.updateOne({ _id: targetListingId }, { $inc: { favoritesCount: 1, bookmarksCount: 1 } });

        await favorite.populate("listing", "title slug propertyNumber featuredImage category subCategory price priceUnit currency location ratingAverage totalReviews availabilityStatus isVerified favoritesCount bookmarksCount");

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
    const filter: any = { user: targetUserId, isDeleted: false };

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
                select: "title slug propertyNumber featuredImage category subCategory price originalPrice priceUnit currency location ratingAverage totalReviews availabilityStatus isVerified favoritesCount bookmarksCount",
            })
            .lean(),
        FavoriteModel.countDocuments(filter),
        FavoriteModel.aggregate([{ $match: { user: targetUserId, isDeleted: false } }, { $group: { _id: "$category", count: { $sum: 1 } } }]),
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
