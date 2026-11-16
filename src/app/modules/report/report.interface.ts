import { Types } from "mongoose";
import { IListing } from "../listing/listing.interface";
import { User } from "../auth/auth.interface";

export enum ReportTargetType {
    LISTING = "LISTING",
    USER = "USER",
}

export enum ReportReason {
    // Listing Reasons
    FRAUD_OR_SCAM = "FRAUD_OR_SCAM",
    INACCURATE_INFORMATION = "INACCURATE_INFORMATION",
    FAKE_OR_MISLEADING_PHOTOS = "FAKE_OR_MISLEADING_PHOTOS",
    ALREADY_RENTED_OR_SOLD = "ALREADY_RENTED_OR_SOLD",
    DUPLICATE_LISTING = "DUPLICATE_LISTING",
    OFFENSIVE_CONTENT = "OFFENSIVE_CONTENT",

    // User Reasons
    SCAMMER_OR_FRAUD = "SCAMMER_OR_FRAUD",
    HARASSMENT_OR_ABUSE = "HARASSMENT_OR_ABUSE",
    IMPERSONATION = "IMPERSONATION",
    SPAM = "SPAM",
    NO_SHOW = "NO_SHOW",

    // General
    OTHER = "OTHER",
}

export enum ReportStatus {
    PENDING = "PENDING",
    UNDER_REVIEW = "UNDER_REVIEW",
    RESOLVED = "RESOLVED",
    DISMISSED = "DISMISSED",
}

export enum ReportPriority {
    LOW = "LOW",
    MEDIUM = "MEDIUM",
    HIGH = "HIGH",
}

export interface IReport {
    _id?: Types.ObjectId;
    reporter: Types.ObjectId | User;
    targetType: ReportTargetType;
    reportedListing?: Types.ObjectId | IListing;
    reportedUser?: Types.ObjectId | User;
    reason: ReportReason;
    description: string;
    evidenceImages?: string[];
    status: ReportStatus;
    priority: ReportPriority;
    adminNotes?: string;
    actionTaken?: string;
    resolvedBy?: Types.ObjectId | User;
    resolvedAt?: Date;
    createdAt?: Date;
    updatedAt?: Date;
}

