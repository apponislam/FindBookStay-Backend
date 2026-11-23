import { Types } from "mongoose";
import httpStatus from "http-status";
import ApiError from "../../../errors/ApiError";
import {
    IReport,
    ReportTargetType,
    ReportReason,
    ReportStatus,
    ReportPriority,
} from "./report.interface";
import { ReportModel } from "./report.model";
import { HomeModel } from "../home/home.model";
import { StayModel } from "../stay/stay.model";
import { TurfModel } from "../turf/turf.model";
import { PropertyModel } from "../property/property.model";
import { UserModel } from "../auth/auth.model";
import { activityLogServices } from "../activityLog/activityLog.services";

/**
 * Submit a report for a listing or a user
 */
const createReport = async (
    reporterId: string,
    payload: Partial<IReport>,
    meta?: { ip?: string; userAgent?: string }
) => {
    const reporterObjectId = new Types.ObjectId(reporterId);

    let reportedListingId: Types.ObjectId | undefined;
    let reportedUserId: Types.ObjectId | undefined;

    // 1. Validate Target: Listing
    if (payload.targetType === ReportTargetType.LISTING) {
        if (!payload.reportedListing || !Types.ObjectId.isValid(payload.reportedListing as any)) {
            throw new ApiError(httpStatus.BAD_REQUEST, "A valid listing ID is required to report a listing.");
        }

        reportedListingId = new Types.ObjectId(payload.reportedListing as any);
        const [home, stay, turf, property] = await Promise.all([
            HomeModel.findOne({ _id: reportedListingId, isDeleted: false }),
            StayModel.findOne({ _id: reportedListingId, isDeleted: false }),
            TurfModel.findOne({ _id: reportedListingId, isDeleted: false }),
            PropertyModel.findOne({ _id: reportedListingId, isDeleted: false }),
        ]);
        const listing = home || stay || turf || property;

        if (!listing) {
            throw new ApiError(httpStatus.NOT_FOUND, "The listing you are trying to report does not exist.");
        }

        if (listing.createdBy.toString() === reporterId.toString()) {
            throw new ApiError(httpStatus.BAD_REQUEST, "You cannot report your own listing.");
        }

        reportedUserId = listing.createdBy;

        // Check if user already has an active pending report for this listing
        const existingReport = await ReportModel.findOne({
            reporter: reporterObjectId,
            reportedListing: reportedListingId,
            status: { $in: [ReportStatus.PENDING, ReportStatus.UNDER_REVIEW] },
        });

        if (existingReport) {
            throw new ApiError(
                httpStatus.CONFLICT,
                "You already have an open report pending review for this listing."
            );
        }
    }

    // 2. Validate Target: User
    if (payload.targetType === ReportTargetType.USER) {
        if (!payload.reportedUser || !Types.ObjectId.isValid(payload.reportedUser as any)) {
            throw new ApiError(httpStatus.BAD_REQUEST, "A valid user ID is required to report a user.");
        }

        reportedUserId = new Types.ObjectId(payload.reportedUser as any);
        const targetUser = await UserModel.findOne({ _id: reportedUserId, isDeleted: false });

        if (!targetUser) {
            throw new ApiError(httpStatus.NOT_FOUND, "The user you are trying to report does not exist.");
        }

        if (reportedUserId.toString() === reporterId.toString()) {
            throw new ApiError(httpStatus.BAD_REQUEST, "You cannot report yourself.");
        }

        // Check if user already has an active pending report for this user
        const existingReport = await ReportModel.findOne({
            reporter: reporterObjectId,
            reportedUser: reportedUserId,
            targetType: ReportTargetType.USER,
            status: { $in: [ReportStatus.PENDING, ReportStatus.UNDER_REVIEW] },
        });

        if (existingReport) {
            throw new ApiError(
                httpStatus.CONFLICT,
                "You already have an open report pending review for this user."
            );
        }
    }

    // 3. Determine Priority automatically based on reason severity
    let priority = ReportPriority.MEDIUM;
    const highSeverityReasons = [
        ReportReason.FRAUD_OR_SCAM,
        ReportReason.SCAMMER_OR_FRAUD,
        ReportReason.HARASSMENT_OR_ABUSE,
        ReportReason.OFFENSIVE_CONTENT,
    ];
    const lowSeverityReasons = [ReportReason.DUPLICATE_LISTING, ReportReason.SPAM, ReportReason.NO_SHOW];

    if (payload.reason && highSeverityReasons.includes(payload.reason)) {
        priority = ReportPriority.HIGH;
    } else if (payload.reason && lowSeverityReasons.includes(payload.reason)) {
        priority = ReportPriority.LOW;
    }

    const report = await ReportModel.create({
        reporter: reporterObjectId,
        targetType: payload.targetType,
        reportedListing: reportedListingId,
        reportedUser: reportedUserId,
        reason: payload.reason,
        description: payload.description,
        evidenceImages: payload.evidenceImages || [],
        status: ReportStatus.PENDING,
        priority,
    });

    await report.populate([
        { path: "reportedListing", select: "title slug category price location" },
        { path: "reportedUser", select: "name email phone profileImage" },
    ]);

    // Audit Log
    activityLogServices.createActivityLog({
        user: reporterObjectId,
        action: "CREATE_REPORT",
        module: "SYSTEM",
        description: `Filed a ${priority} priority report against ${payload.targetType}: ${payload.reason}`,
        status: "SUCCESS",
        ipAddress: meta?.ip,
        userAgent: meta?.userAgent,
        metadata: {
            reportId: report._id,
            targetType: report.targetType,
            reason: report.reason,
        },
    });

    return report;
};

/**
 * Get reports submitted by current user
 */
const getMyReports = async (userId: string, query: Record<string, any>) => {
    const filter: any = { reporter: new Types.ObjectId(userId) };

    if (query.status) filter.status = query.status;
    if (query.targetType) filter.targetType = query.targetType;

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    const [reports, total] = await Promise.all([
        ReportModel.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate("reportedListing", "title slug featuredImage category subCategory price location status")
            .populate("reportedUser", "name profileImage")
            .lean(),
        ReportModel.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
        meta: {
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
        },
        data: reports,
    };
};

/**
 * Get all reports across platform (Admin Only)
 */
const getAllReports = async (query: Record<string, any>) => {
    const filter: any = {};

    if (query.status) filter.status = query.status;
    if (query.targetType) filter.targetType = query.targetType;
    if (query.priority) filter.priority = query.priority;
    if (query.reason) filter.reason = query.reason;

    if (query.search) {
        filter.description = { $regex: query.search.trim(), $options: "i" };
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 15));
    const skip = (page - 1) * limit;

    const [reports, total] = await Promise.all([
        ReportModel.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate("reporter", "name email phone profileImage")
            .populate("reportedListing", "title slug category subCategory price status isVerified")
            .populate("reportedUser", "name email phone profileImage isActive role")
            .populate("resolvedBy", "name email")
            .lean(),
        ReportModel.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
        meta: {
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
        },
        data: reports,
    };
};

/**
 * Get single report details
 */
const getReportById = async (id: string, userId: string, userRole: string) => {
    if (!Types.ObjectId.isValid(id)) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Invalid report ID format.");
    }

    const report = await ReportModel.findById(id)
        .populate("reporter", "name email phone profileImage")
        .populate("reportedListing", "title slug category subCategory price location status isVerified")
        .populate("reportedUser", "name email phone profileImage isActive role")
        .populate("resolvedBy", "name email");

    if (!report) {
        throw new ApiError(httpStatus.NOT_FOUND, "Report not found.");
    }

    const isReporter = (report.reporter as any)?._id?.toString() === userId.toString();
    const isAdmin = userRole === "ADMIN";

    if (!isReporter && !isAdmin) {
        throw new ApiError(httpStatus.FORBIDDEN, "You do not have permission to view this report.");
    }

    return report;
};

/**
 * Resolve, update review, or dismiss report (Admin Only)
 */
const resolveReport = async (
    id: string,
    adminId: string,
    payload: {
        status: ReportStatus;
        actionTaken?: string;
        adminNotes?: string;
        priority?: ReportPriority;
    },
    meta?: { ip?: string; userAgent?: string }
) => {
    if (!Types.ObjectId.isValid(id)) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Invalid report ID format.");
    }

    const report = await ReportModel.findById(id);
    if (!report) {
        throw new ApiError(httpStatus.NOT_FOUND, "Report not found.");
    }

    report.status = payload.status;
    if (payload.actionTaken !== undefined) report.actionTaken = payload.actionTaken;
    if (payload.adminNotes !== undefined) report.adminNotes = payload.adminNotes;
    if (payload.priority !== undefined) report.priority = payload.priority;

    if ([ReportStatus.RESOLVED, ReportStatus.DISMISSED].includes(payload.status)) {
        report.resolvedBy = new Types.ObjectId(adminId);
        report.resolvedAt = new Date();
    }

    await report.save();
    await report.populate([
        { path: "reporter", select: "name email phone" },
        { path: "reportedListing", select: "title slug status" },
        { path: "reportedUser", select: "name email isActive" },
        { path: "resolvedBy", select: "name email" },
    ]);

    // Audit Log
    activityLogServices.createActivityLog({
        user: new Types.ObjectId(adminId),
        role: "ADMIN",
        action: "RESOLVE_REPORT",
        module: "SYSTEM",
        description: `Marked report ${report._id} as ${report.status}. Action: ${report.actionTaken || "None"}`,
        status: "SUCCESS",
        ipAddress: meta?.ip,
        userAgent: meta?.userAgent,
        metadata: {
            reportId: report._id,
            status: report.status,
            actionTaken: report.actionTaken,
        },
    });

    return report;
};

/**
 * Get Report Statistics (Admin Only)
 */
const getReportStats = async () => {
    const [total, pending, underReview, resolved, dismissed, byTargetType] = await Promise.all([
        ReportModel.countDocuments(),
        ReportModel.countDocuments({ status: ReportStatus.PENDING }),
        ReportModel.countDocuments({ status: ReportStatus.UNDER_REVIEW }),
        ReportModel.countDocuments({ status: ReportStatus.RESOLVED }),
        ReportModel.countDocuments({ status: ReportStatus.DISMISSED }),
        ReportModel.aggregate([
            {
                $group: {
                    _id: "$targetType",
                    count: { $sum: 1 },
                },
            },
        ]),
    ]);

    return {
        totalReports: total,
        pendingReports: pending,
        underReviewReports: underReview,
        resolvedReports: resolved,
        dismissedReports: dismissed,
        byTargetType: byTargetType.reduce((acc: any, curr) => {
            acc[curr._id] = curr.count;
            return acc;
        }, {}),
    };
};

export const reportServices = {
    createReport,
    getMyReports,
    getAllReports,
    getReportById,
    resolveReport,
    getReportStats,
};

