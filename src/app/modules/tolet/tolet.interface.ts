import { Types } from "mongoose";

export interface ITolet {
    user: Types.ObjectId;
    title: string;
    rentType: string;
    availableFrom: string;
    floor?: string;
    bedrooms: number;
    bathrooms: number;
    balconies?: number;
    facilities: string[];
    rent: number;
    serviceCharge?: number;
    address: string;
    contactNumber: string;
    contactNumber2?: string;
    notes?: string;
    createdAt?: Date;
    updatedAt?: Date;
}
