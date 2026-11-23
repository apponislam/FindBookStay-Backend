import mongoose, { Schema } from "mongoose";
import { IListingView } from "./listingView.interface";

const ListingViewSchema = new Schema<IListingView>(
    {
        listing: {
            type: Schema.Types.ObjectId,
            required: [true, "Listing ID is required for view tracking."],
        },
        identifier: {
            type: String,
            required: [true, "Visitor identifier is required."],
            trim: true,
        },
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        ipAddress: {
            type: String,
            default: null,
            trim: true,
        },
        userAgent: {
            type: String,
            default: null,
            trim: true,
        },
        visitorId: {
            type: String,
            default: null,
            trim: true,
        },
        viewedAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

// Compound Unique Index: Ensures 1 unique view per visitor/user per listing within the TTL window
ListingViewSchema.index({ listing: 1, identifier: 1 }, { unique: true });

// TTL Index: Automatically auto-purges view logs after 24 hours (86,400 seconds)
ListingViewSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

// Query index for listing analytics
ListingViewSchema.index({ listing: 1, viewedAt: -1 });

export const ListingViewModel = mongoose.model<IListingView>("ListingView", ListingViewSchema);
