import { Types } from "mongoose";

export const USER_ADDRESS_TYPES = ["HOME", "OFFICE", "COLLEGE", "OTHER"] as const;
export type UserAddressType = (typeof USER_ADDRESS_TYPES)[number];

export interface IUserAddress {
    user: Types.ObjectId;
    type: UserAddressType;
    customLabel?: string;
    recipientName?: string;
    phoneNumber?: string;
    street: string;
    apartment?: string;
    area?: string;
    city: string;
    state?: string;
    zipCode?: string;
    country?: string;
    location?: {
        type: "Point";
        coordinates: [number, number]; // [longitude, latitude]
    };
    isDefault: boolean;
    isDeleted: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}
