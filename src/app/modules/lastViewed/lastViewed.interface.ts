import { Types } from "mongoose";
import { ListingCategory, ListingSubCategory } from "../listing/listing.interface";

export interface ILastViewedItem {
    listing: Types.ObjectId;
    category: ListingCategory;
    subCategory?: ListingSubCategory | string;
    listingType?: string; // Vertical-specific type (e.g., stayType, propertyType, sportType, rentType)
    viewedAt: Date;
}

export interface ILastViewed {
    _id?: Types.ObjectId;
    user: Types.ObjectId;
    items: ILastViewedItem[]; // Strictly capped at 10 items (FIFO / LRU sliding window)
    createdAt?: Date;
    updatedAt?: Date;
}
