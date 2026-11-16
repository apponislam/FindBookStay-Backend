import { Types } from "mongoose";
import httpStatus from "http-status";
import ApiError from "../../../errors/ApiError";
import { FavoriteModel } from "./favorite.model";
import { ListingModel } from "../listing/listing.model";

/**
 * Toggle favorite listing (Add if not in favorites, remove if already present)
 */
const toggleFavorite = async (userId: string, listingId: string, note?: string) => {
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

    if (existing) {
        await FavoriteModel.findByIdAndDelete(existing._id);
        return {
            isFavorite: false,
            message: "Listing removed from favorites.",
            data: null,
        };
    } else {
        const favorite = await FavoriteModel.create({
            user: targetUserId,
            listing: targetListingId,
            note,
        });

        await favorite.populate(
            "listing",
            "title slug featuredImage category subCategory price priceUnit currency location ratingAverage totalReviews availabilityStatus isVerified"
        );

        return {
            isFavorite: true,
            message: "Listing saved to favorites successfully.",
            data: favorite,
        };
    }
};

/**
 * Get all favorite listings saved by current user
 */
const getMyFavorites = async (userId: string, query: Record<string, any>) => {
    const filter: any = { user: new Types.ObjectId(userId) };

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 12));
    const skip = (page - 1) * limit;

    const [favorites, total] = await Promise.all([
        FavoriteModel.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate({
                path: "listing",
                match: { isDeleted: false },
                select:
                    "title slug featuredImage category subCategory price originalPrice priceUnit currency location ratingAverage totalReviews availabilityStatus isVerified",
            })
            .lean(),
        FavoriteModel.countDocuments(filter),
    ]);

    // Filter out items where the listing was deleted
    const activeFavorites = favorites.filter((fav) => fav.listing !== null);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
        meta: {
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
        },
        data: activeFavorites,
    };
};

/**
 * Check if a listing is currently favorited by the user
 */
const checkIsFavorite = async (userId: string, listingId: string) => {
    if (!Types.ObjectId.isValid(listingId)) {
        return { isFavorite: false };
    }

    const count = await FavoriteModel.countDocuments({
        user: new Types.ObjectId(userId),
        listing: new Types.ObjectId(listingId),
    });

    return {
        isFavorite: count > 0,
    };
};

/**
 * Remove a listing from favorites explicitly
 */
const removeFavorite = async (userId: string, listingId: string) => {
    if (!Types.ObjectId.isValid(listingId)) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Invalid listing ID format.");
    }

    const result = await FavoriteModel.findOneAndDelete({
        user: new Types.ObjectId(userId),
        listing: new Types.ObjectId(listingId),
    });

    if (!result) {
        throw new ApiError(httpStatus.NOT_FOUND, "This listing was not found in your favorites.");
    }

    return { message: "Listing removed from favorites successfully." };
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
    });

    if (!favorite) {
        throw new ApiError(httpStatus.NOT_FOUND, "This listing was not found in your favorites.");
    }

    favorite.note = note;
    await favorite.save();

    return favorite;
};

/**
 * Get total bookmarks count for a listing
 */
const getListingBookmarkCount = async (listingId: string) => {
    if (!Types.ObjectId.isValid(listingId)) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Invalid listing ID format.");
    }

    const count = await FavoriteModel.countDocuments({
        listing: new Types.ObjectId(listingId),
    });

    return {
        listingId,
        bookmarkCount: count,
    };
};

export const favoriteServices = {
    toggleFavorite,
    getMyFavorites,
    checkIsFavorite,
    removeFavorite,
    updateFavoriteNote,
    getListingBookmarkCount,
};
