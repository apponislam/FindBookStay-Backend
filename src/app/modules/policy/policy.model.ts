import mongoose, { Schema } from "mongoose";
import { IPolicy } from "./policy.interface";

const PolicySchema = new Schema<IPolicy>(
    {
        type: {
            type: String,
            required: [true, "Policy type is required (e.g., TERMS_AND_CONDITIONS, PRIVACY_POLICY, ABOUT_US)."],
            trim: true,
            uppercase: true,
            index: true,
        },
        title: {
            type: String,
            required: [true, "Policy title is required (e.g., 'Terms & Conditions', 'Privacy Policy')."],
            trim: true,
        },
        content: {
            type: String,
            required: [true, "Policy content cannot be empty. Please provide the policy text or HTML content."],
            trim: true,
        },
        slug: {
            type: String,
            lowercase: true,
            trim: true,
            index: true,
        },
        version: {
            type: String,
            default: "1.0",
            trim: true,
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },
        lastUpdatedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        effectiveDate: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

// Auto-generate URL-friendly slug before save if not provided
PolicySchema.pre("save", function () {
    if (!this.slug && this.type) {
        this.slug = this.type.toLowerCase().replace(/_/g, "-");
    }
});

PolicySchema.index({ type: 1, isActive: 1 });
PolicySchema.index({ slug: 1, isActive: 1 });

export const PolicyModel = mongoose.model<IPolicy>("Policy", PolicySchema);
