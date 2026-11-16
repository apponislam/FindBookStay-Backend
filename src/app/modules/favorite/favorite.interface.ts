import { Types } from "mongoose";
import { IListing } from "../listing/listing.interface";

export interface IFavorite {
    _id?: Types.ObjectId;
    user: Types.ObjectId;
    listing: Types.ObjectId | IListing;
    note?: string;
    createdAt?: Date;
    updatedAt?: Date;
}
