import { Types } from "mongoose";
import { IListing, ListingCategory, ListingSubCategory } from "../listing/listing.interface";

export interface IFavorite {
    _id?: Types.ObjectId;
    user: Types.ObjectId;
    listing: Types.ObjectId | IListing;
    category: ListingCategory;
    subCategory?: ListingSubCategory | string;
    listingType?: string; // Vertical-specific type (e.g., rentType, stayType, sportType, propertyType)
    note?: string;
    createdAt?: Date;
    updatedAt?: Date;
}
