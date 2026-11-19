import mongoose, { Schema } from "mongoose";
import { IFAQ, FAQCategory } from "./faq.interface";

const FAQSchema = new Schema<IFAQ>(
    {
        question: {
            type: String,
            required: [true, "Question is required."],
            trim: true,
            maxlength: [300, "Question cannot exceed 300 characters."],
        },
        answer: {
            type: String,
            required: [true, "Answer is required."],
            trim: true,
        },
        category: {
            type: String,
            enum: Object.values(FAQCategory),
            default: FAQCategory.GENERAL,
        },
        tags: {
            type: [String],
            default: [],
        },
        order: {
            type: Number,
            default: 0,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        isDeleted: {
            type: Boolean,
            default: false,
        },
        viewsCount: {
            type: Number,
            default: 0,
            min: 0,
        },
        helpfulCount: {
            type: Number,
            default: 0,
            min: 0,
        },
        notHelpfulCount: {
            type: Number,
            default: 0,
            min: 0,
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
        updatedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

// High-Performance Query Indexes
FAQSchema.index({ category: 1, isActive: 1, isDeleted: 1, order: 1 });
FAQSchema.index({ isDeleted: 1, isActive: 1, order: 1 });

// Full-Text Search Index
FAQSchema.index({ question: "text", answer: "text", tags: "text" });

export const FAQModel = mongoose.model<IFAQ>("FAQ", FAQSchema);

