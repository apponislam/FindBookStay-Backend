import mongoose, { Schema } from "mongoose";
import {
    IReport,
    ReportTargetType,
    ReportReason,
    ReportStatus,
    ReportPriority,
} from "./report.interface";

const ReportSchema = new Schema<IReport>(
    {
        reporter: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: [true, "Reporter user ID is required."],
        },
        targetType: {
            type: String,
            enum: {
                values: Object.values(ReportTargetType),
                message: "Target type must be either LISTING or USER.",
            },
            required: [true, "Report target type is required."],
        },
        reportedListing: {
            type: Schema.Types.ObjectId,
        },
        reportedUser: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
        reason: {
            type: String,
            enum: {
                values: Object.values(ReportReason),
                message: "Invalid report reason '{VALUE}'.",
            },
            required: [true, "Report reason is required."],
        },
        description: {
            type: String,
            required: [true, "Report description is required."],
            trim: true,
            minlength: [10, "Description must be at least 10 characters."],
            maxlength: [2000, "Description cannot exceed 2000 characters."],
        },
        evidenceImages: {
            type: [String],
            default: [],
        },
        status: {
            type: String,
            enum: Object.values(ReportStatus),
            default: ReportStatus.PENDING,
        },
        priority: {
            type: String,
            enum: Object.values(ReportPriority),
            default: ReportPriority.MEDIUM,
        },
        adminNotes: {
            type: String,
            trim: true,
        },
        actionTaken: {
            type: String,
            trim: true,
        },
        resolvedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
        resolvedAt: {
            type: Date,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

// Indexes
ReportSchema.index({ reporter: 1, createdAt: -1 });
ReportSchema.index({ status: 1, priority: 1, createdAt: -1 });
ReportSchema.index({ targetType: 1, status: 1 });
ReportSchema.index({ reportedListing: 1, status: 1 });
ReportSchema.index({ reportedUser: 1, status: 1 });

export const ReportModel = mongoose.model<IReport>("Report", ReportSchema);

