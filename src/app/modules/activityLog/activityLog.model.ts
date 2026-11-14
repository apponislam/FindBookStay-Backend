import mongoose, { Schema } from "mongoose";
import { IActivityLog } from "./activityLog.interface";

const ActivityLogSchema = new Schema<IActivityLog>(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            default: null,
            index: true,
        },
        role: {
            type: String,
            default: null,
        },
        action: {
            type: String,
            required: [true, "Activity action is required"],
            trim: true,
            index: true,
        },
        module: {
            type: String,
            required: [true, "Module name is required"],
            trim: true,
            uppercase: true,
            index: true,
        },
        description: {
            type: String,
            required: [true, "Activity description is required"],
            trim: true,
        },
        status: {
            type: String,
            enum: ["SUCCESS", "FAILED", "WARNING", "INFO"],
            default: "INFO",
            index: true,
        },
        ipAddress: {
            type: String,
            default: null,
            trim: true,
        },
        userAgent: {
            type: String,
            default: null,
            trim: true,
        },
        device: {
            type: String,
            default: null,
            trim: true,
        },
        browser: {
            type: String,
            default: null,
            trim: true,
        },
        os: {
            type: String,
            default: null,
            trim: true,
        },
        metadata: {
            type: Schema.Types.Mixed,
            default: {},
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

// High-performance compound indexes for audit filtering and timeline sorting
ActivityLogSchema.index({ user: 1, createdAt: -1 });
ActivityLogSchema.index({ module: 1, createdAt: -1 });
ActivityLogSchema.index({ action: 1, createdAt: -1 });
ActivityLogSchema.index({ status: 1, createdAt: -1 });
ActivityLogSchema.index({ createdAt: -1 });

export const ActivityLogModel = mongoose.model<IActivityLog>("ActivityLog", ActivityLogSchema);

