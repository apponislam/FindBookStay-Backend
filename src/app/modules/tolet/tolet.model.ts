import mongoose, { Schema } from "mongoose";
import { ITolet } from "./tolet.interface";

const ToletSchema = new Schema<ITolet>(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: [true, "User ID is required."],
        },
        title: {
            type: String,
            required: [true, "Title is required (e.g., 'বাসা ভাড়া দেওয়া হইবে / TO-LET')."],
            trim: true,
            default: "বাসা ভাড়া দেওয়া হইবে (TO-LET)",
        },
        rentType: {
            type: String,
            required: [true, "Rent type is required (e.g., 'ফ্যামিলি', 'ব্যাচেলর', 'সাবলেট')."],
            trim: true,
            default: "ফ্যামিলি",
        },
        availableFrom: {
            type: String,
            required: [true, "Available from is required (e.g., '১লা জানুয়ারি' or 'From 1st January')."],
            trim: true,
        },
        floor: {
            type: String,
            trim: true,
            default: "",
        },
        bedrooms: {
            type: Number,
            required: [true, "Bedrooms count is required."],
            min: 0,
            default: 1,
        },
        bathrooms: {
            type: Number,
            required: [true, "Bathrooms count is required."],
            min: 0,
            default: 1,
        },
        balconies: {
            type: Number,
            min: 0,
            default: 0,
        },
        facilities: {
            type: [String],
            default: [],
        },
        rent: {
            type: Number,
            required: [true, "Rent amount is required."],
            min: 0,
        },
        serviceCharge: {
            type: Number,
            min: 0,
            default: 0,
        },
        address: {
            type: String,
            required: [true, "Address is required."],
            trim: true,
        },
        contactNumber: {
            type: String,
            required: [true, "Contact phone number is required."],
            trim: true,
        },
        contactNumber2: {
            type: String,
            trim: true,
            default: "",
        },
        notes: {
            type: String,
            trim: true,
            default: "",
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

// High-performance index for user To-Let lookups without duplicates
ToletSchema.index({ user: 1, createdAt: -1 });

export const ToletModel = mongoose.model<ITolet>("Tolet", ToletSchema);
