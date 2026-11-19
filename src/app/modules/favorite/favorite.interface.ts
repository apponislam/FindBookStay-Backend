import { Types } from "mongoose";
import { IListing, ListingCategory } from "../listing/listing.interface";

export interface IFavorite {
    _id?: Types.ObjectId;
    user: Types.ObjectId;
    listing: Types.ObjectId | IListing;
    category: ListingCategory;
    note?: string;
    isDeleted: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}
