import { Types } from "mongoose";
import { ListingCategory } from "../../enums/listingCategory";

export type FavoriteItemModel = "Home" | "Stay" | "Turf" | "Property";

export interface IFavorite {
    _id?: Types.ObjectId;
    user: Types.ObjectId;
    listing: Types.ObjectId | any;
    itemModel?: FavoriteItemModel;
    category: ListingCategory;
    note?: string;
    isDeleted: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}
