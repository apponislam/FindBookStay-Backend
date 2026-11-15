import { Types } from "mongoose";

export const ADDRESS_TYPES = ["COUNTRY", "STATE", "CITY", "AREA", "ZONE"] as const;

export type AddressType = (typeof ADDRESS_TYPES)[number];

export interface IAddress {
    addressType: AddressType;
    address: string;
    upperLevelAddress?: Types.ObjectId | null;
    createdAt?: Date;
    updatedAt?: Date;
}
