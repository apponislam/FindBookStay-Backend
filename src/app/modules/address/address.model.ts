import mongoose, { Schema } from "mongoose";
import { IAddress, ADDRESS_TYPES } from "./address.interface";

const AddressSchema = new Schema<IAddress>(
    {
        addressType: {
            type: String,
            enum: {
                values: ADDRESS_TYPES,
                message: "{VALUE} is not a valid international address type",
            },
            required: [true, "Address type is required"],
            uppercase: true,
            trim: true,
        },
        address: {
            type: String,
            required: [true, "Address is required"],
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
