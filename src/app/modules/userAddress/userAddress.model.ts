import mongoose, { Schema } from "mongoose";
import { IUserAddress, USER_ADDRESS_TYPES } from "./userAddress.interface";

const UserAddressSchema = new Schema<IUserAddress>(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: [true, "User ID is required for a saved address."],
        },
        type: {
            type: String,
            enum: {
                values: USER_ADDRESS_TYPES,
                message: "Invalid address type '{VALUE}'. Must be HOME, OFFICE, COLLEGE, or OTHER.",
            },
            default: "HOME",
            uppercase: true,
            trim: true,
        },
        customLabel: {
            type: String,
            trim: true,
            default: "",
        },
        recipientName: {
            type: String,
            trim: true,
            default: "",
        },
        phoneNumber: {
            type: String,
            trim: true,
            default: "",
        },
        street: {
            type: String,
            required: [true, "Street / house address is required."],
            trim: true,
        },
        apartment: {
            type: String,
            trim: true,
            default: "",
        },
        area: {
            type: String,
            trim: true,
            default: "",
        },
        city: {
            type: String,
            required: [true, "City is required."],
            trim: true,
        },
        state: {
            type: String,
            trim: true,
            default: "",
        },
        zipCode: {
            type: String,
            trim: true,
            default: "",
        },
        country: {
            type: String,
            trim: true,
            default: "Bangladesh",
        },
        location: {
            type: {
                type: String,
                enum: ["Point"],
                default: "Point",
            },
            coordinates: {
                type: [Number], // [longitude, latitude]
                default: undefined,
            },
        },
        isDefault: {
            type: Boolean,
            default: false,
        },
        isDeleted: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    },
);

// High-performance compound indexes for user address lookup
UserAddressSchema.index({ user: 1, isDeleted: 1, isDefault: -1 });
UserAddressSchema.index({ user: 1, type: 1, isDeleted: 1 });
UserAddressSchema.index({ "location.coordinates": "2dsphere" }, { sparse: true });

export const UserAddressModel = mongoose.model<IUserAddress>("UserAddress", UserAddressSchema);
