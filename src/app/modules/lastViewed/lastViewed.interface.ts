import { Types } from "mongoose";
import { ListingCategory } from "../../enums/listingCategory";

export type LastViewedItemModel = "Home" | "Stay" | "Turf" | "Property";

export interface ILastViewedItem {
    listing: Types.ObjectId;
    itemModel?: LastViewedItemModel;
    category: ListingCategory;
    viewedAt: Date;
}

export interface ILastViewed {
    _id?: Types.ObjectId;
    user: Types.ObjectId;
    items: ILastViewedItem[]; // Strictly capped at 10 items (FIFO / LRU sliding window)
    createdAt?: Date;
    updatedAt?: Date;
}
