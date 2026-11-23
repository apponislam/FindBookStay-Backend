import { Types } from "mongoose";

export type ReviewItemModel = "Home" | "Stay" | "Turf" | "Property";

export interface IReviewSubRatings {
    cleanliness?: number;
    accuracy?: number;
    communication?: number;
    location?: number;
    value?: number;
}

export interface IReviewReply {
    comment: string;
    repliedAt: Date;
    repliedBy: Types.ObjectId;
}

export interface IReview {
    _id?: Types.ObjectId;
    user: Types.ObjectId;
    listing: Types.ObjectId | any;
    itemModel?: ReviewItemModel;
    rating: number; // 1 to 5
    comment: string;
    images?: string[];
    subRatings?: IReviewSubRatings;
    reply?: IReviewReply;
    isEdited?: boolean;
    isApproved?: boolean;
    isDeleted?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}
