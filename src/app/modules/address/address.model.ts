import mongoose, { Schema } from "mongoose";
import { IAddress, ADDRESS_TYPES } from "./address.interface";

const AddressSchema = new Schema<IAddress>(
    {
        addressType: {
            type: String,
            enum: {
                values: ADDRESS_TYPES,
                message: "Invalid address type '{VALUE}'. Please select a valid type: COUNTRY, STATE, CITY, AREA, or ZONE.",
            },
            required: [true, "Address type is required. Please select COUNTRY, STATE, CITY, AREA, or ZONE."],
            uppercase: true,
            trim: true,
        },
        address: {
            type: String,
            required: [true, "Address name is required. Please provide a location name (e.g., 'Bangladesh', 'Dhaka', 'Gulshan')."],
            trim: true,
        },
        upperLevelAddress: {
            type: Schema.Types.ObjectId,
            ref: "Address",
            default: null,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

AddressSchema.index({ addressType: 1 });
AddressSchema.index({ upperLevelAddress: 1 });
AddressSchema.index({ address: 1 });

export const AddressModel = mongoose.model<IAddress>("Address", AddressSchema);
