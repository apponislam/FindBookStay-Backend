import mongoose, { Schema, Model, Types } from "mongoose";
import { IReview } from "./review.interface";
import { HomeModel } from "../home/home.model";
import { StayModel } from "../stay/stay.model";
import { TurfModel } from "../turf/turf.model";
import { PropertyModel } from "../property/property.model";
import { homeRedis } from "../home/home.redis";
import { stayRedis } from "../stay/stay.redis";
import { turfRedis } from "../turf/turf.redis";
import { propertyRedis } from "../property/property.redis";

export interface ReviewModelType extends Model<IReview> {
    calculateAverageRating(listingId: Types.ObjectId | any): Promise<void>;
}

const SubRatingsSchema = new Schema(
    {
        cleanliness: { type: Number, min: 1, max: 5 },
        accuracy: { type: Number, min: 1, max: 5 },
        communication: { type: Number, min: 1, max: 5 },
        location: { type: Number, min: 1, max: 5 },
        value: { type: Number, min: 1, max: 5 },
    },
    { _id: false },
);

const ReviewReplySchema = new Schema(
    {
        comment: { type: String, required: true, trim: true, maxlength: 1000 },
        repliedAt: { type: Date, default: Date.now },
        repliedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    },
    { _id: false },
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
            refPath: "itemModel",
            required: [true, "Listing ID is required."],
        },
        itemModel: {
            type: String,
            required: [true, "Item model is required."],
            enum: ["Home", "Stay", "Turf", "Property"],
            default: "Home",
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
    },
);

// Indexes
ReviewSchema.index({ user: 1, listing: 1, isDeleted: 1 });
ReviewSchema.index({ listing: 1, isDeleted: 1, createdAt: -1 });
ReviewSchema.index({ user: 1, isDeleted: 1, createdAt: -1 });
ReviewSchema.index({ rating: 1 });

// Static method to recalculate listing rating and total reviews
ReviewSchema.statics.calculateAverageRating = async function (listingId: Types.ObjectId | any): Promise<void> {
    const targetId =
        listingId instanceof Types.ObjectId
            ? listingId
            : typeof listingId === "string"
            ? new Types.ObjectId(listingId)
            : (listingId as any)?._id
            ? new Types.ObjectId((listingId as any)._id)
            : listingId;

    const stats = await this.aggregate([
        {
            $match: {
                listing: targetId,
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

    const totalReviews = stats.length > 0 ? stats[0].totalReviews : 0;
    const ratingAverage = stats.length > 0 ? Math.round(stats[0].ratingAverage * 10) / 10 : 0;

    await Promise.all([
        HomeModel.findByIdAndUpdate(targetId, { totalReviews, ratingAverage }),
        StayModel.findByIdAndUpdate(targetId, { totalReviews, ratingAverage }),
        TurfModel.findByIdAndUpdate(targetId, { totalReviews, ratingAverage }),
        PropertyModel.findByIdAndUpdate(targetId, { totalReviews, ratingAverage }),
    ]);

    const idStr = targetId.toString();
    await Promise.allSettled([
        homeRedis.invalidateHome(idStr),
        stayRedis.invalidateStay(idStr),
        turfRedis.invalidateTurf(idStr),
        propertyRedis.invalidateProperty(idStr),
    ]);
};

export const ReviewModel = mongoose.model<IReview, ReviewModelType>("Review", ReviewSchema);
