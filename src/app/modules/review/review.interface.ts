import { Types } from "mongoose";

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
    listing: Types.ObjectId;
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

export interface IReviewFilterOptions {
    listingId?: string;
    userId?: string;
    rating?: number;
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: "rating" | "createdAt" | string;
    sortOrder?: "asc" | "desc";
}

export interface IRatingBreakdown {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
}
