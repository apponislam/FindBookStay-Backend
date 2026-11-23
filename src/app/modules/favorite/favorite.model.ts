import mongoose, { Schema } from "mongoose";
import { IFavorite } from "./favorite.interface";
import { ListingCategory } from "../../enums/listingCategory";

const FavoriteSchema = new Schema<IFavorite>(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: [true, "User ID is required."],
        },
        listing: {
            type: Schema.Types.ObjectId,
            refPath: "itemModel",
            required: [true, "Listing ID is required."],
        },
        itemModel: {
            type: String,
            enum: ["Home", "Stay", "Turf", "Property"],
            default: "Home",
        },
        category: {
            type: String,
            enum: Object.values(ListingCategory),
            required: [true, "Listing category is required."],
        },
        note: {
            type: String,
            trim: true,
            maxlength: [300, "Note cannot exceed 300 characters."],
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
FavoriteSchema.index({ user: 1, listing: 1 }, { unique: true });
FavoriteSchema.index({ user: 1, isDeleted: 1, createdAt: -1 });
FavoriteSchema.index({ user: 1, category: 1, isDeleted: 1, createdAt: -1 });
FavoriteSchema.index({ listing: 1, isDeleted: 1 });

export const FavoriteModel = mongoose.model<IFavorite>("Favorite", FavoriteSchema);
