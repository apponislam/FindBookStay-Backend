import mongoose, { Schema } from "mongoose";
import { ILastViewed, ILastViewedItem } from "./lastViewed.interface";
import { ListingCategory } from "../listing/listing.interface";

const LastViewedItemSchema = new Schema<ILastViewedItem>(
    {
        listing: {
            type: Schema.Types.ObjectId,
            ref: "Listing",
            required: [true, "Listing ID is required."],
        },
        category: {
            type: String,
            enum: Object.values(ListingCategory),
            required: [true, "Listing category is required."],
        },
        viewedAt: {
            type: Date,
            default: Date.now,
        },
    },
    { _id: false }
);

const LastViewedSchema = new Schema<ILastViewed>(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: [true, "User ID is required for last viewed history."],
        },
        items: {
            type: [LastViewedItemSchema],
            default: [],
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

// Unique index: 1 document per user
LastViewedSchema.index({ user: 1 }, { unique: true });
LastViewedSchema.index({ "items.category": 1 });

export const LastViewedModel = mongoose.model<ILastViewed>("LastViewed", LastViewedSchema);
