import mongoose, { Schema, Model, Types } from "mongoose";
import { IReview } from "./review.interface";
import { ListingModel } from "../listing/listing.model";

export interface ReviewModelType extends Model<IReview> {
    calculateAverageRating(listingId: Types.ObjectId): Promise<void>;
}

const SubRatingsSchema = new Schema(
    {
        cleanliness: { type: Number, min: 1, max: 5 },
        accuracy: { type: Number, min: 1, max: 5 },
        communication: { type: Number, min: 1, max: 5 },
        location: { type: Number, min: 1, max: 5 },
        value: { type: Number, min: 1, max: 5 },
    },
    { _id: false }
);

const ReviewReplySchema = new Schema(
    {
        comment: { type: String, required: true, trim: true, maxlength: 1000 },
        repliedAt: { type: Date, default: Date.now },
        repliedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    },
    { _id: false }
);

const ReviewSchema = new Schema<IReview, ReviewModelType>(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: [true, "Reviewer user ID is required."],
        },
        listing: {
            type: Schema.Types.ObjectId,
            ref: "Listing",
            required: [true, "Listing ID is required."],
        },
        rating: {
            type: Number,
            required: [true, "Rating is required."],
            min: [1, "Rating must be at least 1."],
            max: [5, "Rating cannot exceed 5."],
        },
        comment: {
            type: String,
            required: [true, "Review comment is required."],
            trim: true,
            minlength: [3, "Comment must be at least 3 characters."],
            maxlength: [1000, "Comment cannot exceed 1000 characters."],
        },
        images: {
            type: [String],
            default: [],
        },
        subRatings: SubRatingsSchema,
        reply: ReviewReplySchema,
        isEdited: {
            type: Boolean,
            default: false,
        },
        isApproved: {
            type: Boolean,
            default: true,
        },
        isDeleted: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

// Indexes
ReviewSchema.index({ user: 1, listing: 1, isDeleted: 1 });
ReviewSchema.index({ listing: 1, isDeleted: 1, createdAt: -1 });
ReviewSchema.index({ user: 1, isDeleted: 1, createdAt: -1 });
ReviewSchema.index({ rating: 1 });

// Static method to recalculate listing rating and total reviews
ReviewSchema.statics.calculateAverageRating = async function (listingId: Types.ObjectId): Promise<void> {
    const stats = await this.aggregate([
        {
            $match: {
                listing: listingId,
                isDeleted: false,
                isApproved: true,
            },
        },
        {
            $group: {
                _id: "$listing",
                totalReviews: { $sum: 1 },
                ratingAverage: { $avg: "$rating" },
            },
        },
    ]);

    if (stats.length > 0) {
        await ListingModel.findByIdAndUpdate(listingId, {
            totalReviews: stats[0].totalReviews,
            ratingAverage: Math.round(stats[0].ratingAverage * 10) / 10,
        });
    } else {
        await ListingModel.findByIdAndUpdate(listingId, {
            totalReviews: 0,
            ratingAverage: 0,
        });
    }
};

export const ReviewModel = mongoose.model<IReview, ReviewModelType>("Review", ReviewSchema);
