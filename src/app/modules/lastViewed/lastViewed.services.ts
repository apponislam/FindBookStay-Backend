import { Types } from "mongoose";
import httpStatus from "http-status";
import ApiError from "../../../errors/ApiError";
import { LastViewedModel } from "./lastViewed.model";
import { LastViewedItemModel } from "./lastViewed.interface";
import { ListingCategory } from "../../enums/listingCategory";
import { HomeModel } from "../home/home.model";
import { StayModel } from "../stay/stay.model";
import { TurfModel } from "../turf/turf.model";
import { PropertyModel } from "../property/property.model";

/**
 * Record a listing to a user's last viewed history.
 * Strictly maintains a sliding window of max 10 items (replaces the oldest).
 * Dynamically resolves whether the item is a Home, Stay, Turf, Property, or Listing.
 */
const recordLastViewed = async (
    userId: string | Types.ObjectId,
    listingId: string | Types.ObjectId,
    explicitCategory?: ListingCategory | string,
    explicitItemModel?: LastViewedItemModel
) => {
    try {
        const userObjId = new Types.ObjectId(userId);
        const listingObjId = new Types.ObjectId(listingId);

        let category = explicitCategory as ListingCategory | undefined;
        let itemModel: LastViewedItemModel | undefined = explicitItemModel;

        const categoryMap: Record<string, { category: ListingCategory; model: LastViewedItemModel }> = {
            HOME: { category: ListingCategory.HOME, model: "Home" },
            STAY: { category: ListingCategory.STAY, model: "Stay" },
            TURF: { category: ListingCategory.TURF, model: "Turf" },
            PROPERTY: { category: ListingCategory.PROPERTY, model: "Property" },
        };

        if (category && categoryMap[category]) {
            category = categoryMap[category].category;
            if (!itemModel) {
                itemModel = categoryMap[category].model;
            }
        }

        // Fetch category & model from collections if not explicitly determined
        if (!category || !itemModel) {
            const [home, stay, turf, property] = await Promise.all([
                HomeModel.findById(listingObjId).select("_id"),
                StayModel.findById(listingObjId).select("_id"),
                TurfModel.findById(listingObjId).select("_id"),
                PropertyModel.findById(listingObjId).select("_id"),
            ]);

            if (home) {
                category = ListingCategory.HOME;
                itemModel = "Home";
            } else if (stay) {
                category = ListingCategory.STAY;
                itemModel = "Stay";
            } else if (turf) {
                category = ListingCategory.TURF;
                itemModel = "Turf";
            } else if (property) {
                category = ListingCategory.PROPERTY;
                itemModel = "Property";
            } else {
                return null;
            }
        }

        // 1. Remove existing occurrence of this listing from user's history (prevents duplicates)
        await LastViewedModel.updateOne(
            { user: userObjId },
            { $pull: { items: { listing: listingObjId } } }
        );

        // 2. Prepend new item to the top and strictly slice to 10 items
        const updated = await LastViewedModel.findOneAndUpdate(
            { user: userObjId },
            {
                $push: {
                    items: {
                        $each: [
                            {
                                listing: listingObjId,
                                itemModel,
                                category,
                                viewedAt: new Date(),
                            },
                        ],
                        $position: 0,
                        $slice: 10,
                    },
                },
            },
            { upsert: true, new: true }
        );

        return updated;
    } catch (err: any) {
        console.error("⚠️ [Last Viewed Record Error]:", err.message);
        return null;
    }
};

/**
 * Get current user's last viewed listings (Max 10 items)
 */
const getMyLastViewed = async (
    userId: string,
    filters?: { category?: string }
) => {
    const userObjId = new Types.ObjectId(userId);

    const doc = await LastViewedModel.findOne({ user: userObjId })
        .populate({
            path: "items.listing",
            select: "title slug propertyNumber price priceUnit currency featuredImage images location ratingAverage totalReviews status availabilityStatus isFeatured isVerified isDeleted",
        })
        .lean();

    if (!doc || !doc.items) {
        return [];
    }

    // Filter out soft-deleted listings or unpopulated references
    let items = doc.items.filter((item: any) => item.listing && !item.listing.isDeleted);

    // Optional category filter
    if (filters?.category) {
        items = items.filter((item: any) => item.category === filters.category);
    }

    return items;
};

/**
 * Remove a specific listing from user's last viewed history
 */
const removeLastViewedItem = async (userId: string, listingId: string) => {
    const userObjId = new Types.ObjectId(userId);
    const listingObjId = new Types.ObjectId(listingId);

    const result = await LastViewedModel.findOneAndUpdate(
        { user: userObjId },
        { $pull: { items: { listing: listingObjId } } },
        { new: true }
    );

    if (!result) {
        throw new ApiError(httpStatus.NOT_FOUND, "Last viewed history not found.");
    }

    return result;
};

/**
 * Clear all last viewed history for the user
 */
const clearMyLastViewed = async (userId: string) => {
    const userObjId = new Types.ObjectId(userId);

    await LastViewedModel.findOneAndUpdate(
        { user: userObjId },
        { $set: { items: [] } },
        { upsert: true }
    );

    return { message: "Last viewed history cleared successfully." };
};

export const lastViewedServices = {
    recordLastViewed,
    getMyLastViewed,
    removeLastViewedItem,
    clearMyLastViewed,
};
