import { Types } from "mongoose";
import httpStatus from "http-status";
import ApiError from "../../../errors/ApiError";
import { IReview, IReviewFilterOptions } from "./review.interface";
import { ReviewModel } from "./review.model";
import { ListingModel } from "../listing/listing.model";
import { activityLogServices } from "../activityLog/activityLog.services";

/**
 * Create a new review for a listing
 */
const createReview = async (
    userId: string,
    payload: Partial<IReview>,
    meta?: { ip?: string; userAgent?: string }
) => {
    if (!payload.listing || !Types.ObjectId.isValid(payload.listing as any)) {
        throw new ApiError(httpStatus.BAD_REQUEST, "A valid listing ID is required.");
    }

    const listingId = new Types.ObjectId(payload.listing as any);
    const reviewerId = new Types.ObjectId(userId);

    // Verify listing exists and is active
    const listing = await ListingModel.findOne({ _id: listingId, isDeleted: false });
    if (!listing) {
        throw new ApiError(httpStatus.NOT_FOUND, "The listing you are reviewing could not be found.");
    }

    // Prevent property owner from reviewing their own listing
    if (listing.createdBy.toString() === userId.toString()) {
        throw new ApiError(httpStatus.BAD_REQUEST, "You cannot review your own listing.");
    }

    // Check if user has already reviewed this listing
    const existingReview = await ReviewModel.findOne({
        user: reviewerId,
        listing: listingId,
        isDeleted: false,
    });

    if (existingReview) {
        throw new ApiError(
            httpStatus.CONFLICT,
            "You have already submitted a review for this listing. You can edit your existing review instead."
        );
    }

    const review = await ReviewModel.create({
        user: reviewerId,
        listing: listingId,
        rating: payload.rating,
        comment: payload.comment,
        images: payload.images || [],
        subRatings: payload.subRatings,
        isEdited: false,
        isApproved: true,
        isDeleted: false,
    });

    // Recalculate listing rating stats
    await ReviewModel.calculateAverageRating(listingId);

    // Populate user details for response
    await review.populate("user", "name profileImage email");

    // Audit Log
    activityLogServices.createActivityLog({
        user: reviewerId,
        action: "CREATE_REVIEW",
        module: (listing.category as any) || "SYSTEM",
        description: `Left a ${payload.rating}-star review on "${listing.title}"`,
        status: "SUCCESS",
        ipAddress: meta?.ip,
        userAgent: meta?.userAgent,
        metadata: {
            reviewId: review._id,
            listingId: listing._id,
            rating: review.rating,
        },
    });

    return review;
};

/**
 * Get all reviews for a specific listing with breakdown
 */
const getReviewsByListing = async (listingId: string, query: IReviewFilterOptions) => {
    if (!Types.ObjectId.isValid(listingId)) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Invalid listing ID format.");
    }

    const targetId = new Types.ObjectId(listingId);
    const filter: any = {
        listing: targetId,
        isDeleted: false,
        isApproved: true,
    };

    if (query.rating) {
        filter.rating = Number(query.rating);
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    let sort: any = { createdAt: -1 };
    if (query.sortBy === "rating") {
        sort = { rating: query.sortOrder === "asc" ? 1 : -1 };
    }

    const [reviews, total, rawBreakdown] = await Promise.all([
        ReviewModel.find(filter)
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .populate("user", "name profileImage")
            .populate("reply.repliedBy", "name profileImage")
            .lean(),
        ReviewModel.countDocuments(filter),
        ReviewModel.aggregate([
            {
                $match: {
                    listing: targetId,
                    isDeleted: false,
                    isApproved: true,
                },
            },
            {
                $group: {
                    _id: "$rating",
                    count: { $sum: 1 },
                },
            },
        ]),
    ]);

    // Format 1 to 5 star breakdown
    const ratingBreakdown: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    rawBreakdown.forEach((item) => {
        if (ratingBreakdown[item._id] !== undefined) {
            ratingBreakdown[item._id] = item.count;
        }
    });

    return {
        meta: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
        ratingBreakdown,
        data: reviews,
    };
};

/**
 * Get reviews written by the authenticated user
 */
const getMyReviews = async (userId: string, query: IReviewFilterOptions) => {
    const filter: any = {
        user: new Types.ObjectId(userId),
        isDeleted: false,
    };

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
        ReviewModel.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate("listing", "title slug featuredImage category subCategory price priceUnit location")
            .populate("reply.repliedBy", "name profileImage")
            .lean(),
        ReviewModel.countDocuments(filter),
    ]);

    return {
        meta: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
        data: reviews,
    };
};

/**
 * Update review
 */
const updateReview = async (
    id: string,
    userId: string,
    userRole: string,
    payload: Partial<IReview>,
    meta?: { ip?: string; userAgent?: string }
) => {
    if (!Types.ObjectId.isValid(id)) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Invalid review ID format.");
    }

    const review = await ReviewModel.findOne({ _id: id, isDeleted: false });
    if (!review) {
        throw new ApiError(httpStatus.NOT_FOUND, "Review not found.");
    }

    const isAuthor = review.user.toString() === userId.toString();
    const isAdmin = userRole === "ADMIN";

    if (!isAuthor && !isAdmin) {
        throw new ApiError(httpStatus.FORBIDDEN, "You do not have permission to edit this review.");
    }

    if (payload.rating !== undefined) review.rating = payload.rating;
    if (payload.comment !== undefined) review.comment = payload.comment;
    if (payload.images !== undefined) review.images = payload.images;
    if (payload.subRatings !== undefined) review.subRatings = payload.subRatings;

    review.isEdited = true;
    await review.save();

    // Recalculate rating in case it changed
    await ReviewModel.calculateAverageRating(review.listing);

    await review.populate("user", "name profileImage");

    // Audit Log
    activityLogServices.createActivityLog({
        user: new Types.ObjectId(userId),
        role: userRole,
        action: "UPDATE_REVIEW",
        module: "SYSTEM",
        description: `Updated review on listing ${review.listing}`,
        status: "SUCCESS",
        ipAddress: meta?.ip,
        userAgent: meta?.userAgent,
        metadata: { reviewId: review._id, rating: review.rating },
    });

    return review;
};

/**
 * Delete review (Soft delete)
 */
const deleteReview = async (
    id: string,
    userId: string,
    userRole: string,
    meta?: { ip?: string; userAgent?: string }
) => {
    if (!Types.ObjectId.isValid(id)) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Invalid review ID format.");
    }

    const review = await ReviewModel.findOne({ _id: id, isDeleted: false });
    if (!review) {
        throw new ApiError(httpStatus.NOT_FOUND, "Review not found.");
    }

    const isAuthor = review.user.toString() === userId.toString();
    const isAdmin = userRole === "ADMIN";

    if (!isAuthor && !isAdmin) {
        throw new ApiError(httpStatus.FORBIDDEN, "You do not have permission to delete this review.");
    }

    review.isDeleted = true;
    await review.save();

    // Recalculate listing rating stats after removal
    await ReviewModel.calculateAverageRating(review.listing);

    // Audit Log
    activityLogServices.createActivityLog({
        user: new Types.ObjectId(userId),
        role: userRole,
        action: "DELETE_REVIEW",
        module: "SYSTEM",
        description: `Deleted review on listing ${review.listing}`,
        status: "SUCCESS",
        ipAddress: meta?.ip,
        userAgent: meta?.userAgent,
        metadata: { reviewId: review._id },
    });

    return { message: "Review deleted successfully." };
};

/**
 * Reply to a review (Listing owner or Admin)
 */
const replyToReview = async (
    id: string,
    userId: string,
    userRole: string,
    comment: string
) => {
    if (!Types.ObjectId.isValid(id)) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Invalid review ID format.");
    }

    const review = await ReviewModel.findOne({ _id: id, isDeleted: false });
    if (!review) {
        throw new ApiError(httpStatus.NOT_FOUND, "Review not found.");
    }

    const listing = await ListingModel.findById(review.listing);
    if (!listing) {
        throw new ApiError(httpStatus.NOT_FOUND, "Associated listing not found.");
    }

    const isListingOwner =
        listing.createdBy.toString() === userId.toString() ||
        (listing.owner && listing.owner.toString() === userId.toString());
    const isAdmin = userRole === "ADMIN";

    if (!isListingOwner && !isAdmin) {
        throw new ApiError(
            httpStatus.FORBIDDEN,
            "Only the host or property owner can reply to this review."
        );
    }

    review.reply = {
        comment,
        repliedAt: new Date(),
        repliedBy: new Types.ObjectId(userId),
    };

    await review.save();
    await review.populate("reply.repliedBy", "name profileImage");

    return review;
};

/**
 * Get all reviews (Admin Only)
 */
const getAllReviews = async (query: IReviewFilterOptions) => {
    const filter: any = { isDeleted: false };

    if (query.rating) filter.rating = Number(query.rating);
    if (query.listingId && Types.ObjectId.isValid(query.listingId)) {
        filter.listing = new Types.ObjectId(query.listingId);
    }
    if (query.userId && Types.ObjectId.isValid(query.userId)) {
        filter.user = new Types.ObjectId(query.userId);
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 15));
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
        ReviewModel.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate("user", "name email profileImage")
            .populate("listing", "title slug category price")
            .populate("reply.repliedBy", "name profileImage")
            .lean(),
        ReviewModel.countDocuments(filter),
    ]);

    return {
        meta: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
        data: reviews,
    };
};

export const reviewServices = {
    createReview,
    getReviewsByListing,
    getMyReviews,
    updateReview,
    deleteReview,
    replyToReview,
    getAllReviews,
};
