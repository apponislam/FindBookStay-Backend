import { Types } from "mongoose";
import httpStatus from "http-status";
import ApiError from "../../../errors/ApiError";
import { IActivityLog, IActivityLogFilter, IPaginationOptions } from "./activityLog.interface";
import { ActivityLogModel } from "./activityLog.model";

const parseUserAgent = (userAgent?: string) => {
    if (!userAgent) {
        return { browser: "Unknown", os: "Unknown", device: "Desktop" };
    }

    let browser = "Unknown";
    let os = "Unknown";
    let device = "Desktop";

    // Detect Device
    if (/tablet|ipad|playbook|silk/i.test(userAgent)) {
        device = "Tablet";
    } else if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile|wpdesktop/i.test(userAgent)) {
        device = "Mobile";
    }

    // Detect OS
    if (/windows nt 10/i.test(userAgent)) os = "Windows 10/11";
    else if (/windows nt 6.3/i.test(userAgent)) os = "Windows 8.1";
    else if (/windows nt 6.2/i.test(userAgent)) os = "Windows 8";
    else if (/windows nt 6.1/i.test(userAgent)) os = "Windows 7";
    else if (/windows/i.test(userAgent)) os = "Windows";
    else if (/macintosh|mac os x/i.test(userAgent)) os = "macOS";
    else if (/iphone|ipad|ipod/i.test(userAgent)) os = "iOS";
    else if (/android/i.test(userAgent)) os = "Android";
    else if (/linux/i.test(userAgent)) os = "Linux";

    // Detect Browser
    if (/edg/i.test(userAgent)) browser = "Edge";
    else if (/chrome|crios/i.test(userAgent) && !/opr|opera/i.test(userAgent)) browser = "Chrome";
    else if (/firefox|fxios/i.test(userAgent)) browser = "Firefox";
    else if (/safari/i.test(userAgent) && !/chrome|crios/i.test(userAgent)) browser = "Safari";
    else if (/opr|opera/i.test(userAgent)) browser = "Opera";
    else if (/msie|trident/i.test(userAgent)) browser = "Internet Explorer";

    return { browser, os, device };
};

const createActivityLog = async (payload: Partial<IActivityLog>): Promise<IActivityLog | null> => {
    try {
        let device = payload.device;
        let browser = payload.browser;
        let os = payload.os;

        if ((!device || !browser || !os) && payload.userAgent) {
            const parsed = parseUserAgent(payload.userAgent);
            device = device || parsed.device;
            browser = browser || parsed.browser;
            os = os || parsed.os;
        }

        const log = await ActivityLogModel.create({
            user: payload.user || null,
            role: payload.role || null,
            action: payload.action || "UNKNOWN_ACTION",
            module: payload.module ? payload.module.toUpperCase() : "SYSTEM",
            description: payload.description || "Activity logged",
            status: payload.status || "INFO",
            ipAddress: payload.ipAddress || null,
            userAgent: payload.userAgent || null,
            device: device || null,
            browser: browser || null,
            os: os || null,
            metadata: payload.metadata || {},
        });

        return log;
    } catch (error) {
        // Never let audit log failure crash the primary business logic
        console.error("Failed to create activity log:", error);
        return null;
    }
};

const getMyLogs = async (userId: string, filters: IActivityLogFilter, pagination: IPaginationOptions) => {
    const page = Math.max(1, Number(pagination.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(pagination.limit) || 10));
    const skip = (page - 1) * limit;

    const query: any = { user: new Types.ObjectId(userId) };

    if (filters.action) {
        query.action = { $regex: filters.action, $options: "i" };
    }

    if (filters.module) {
        query.module = filters.module.toUpperCase();
    }

    if (filters.status) {
        query.status = filters.status.toUpperCase();
    }

    if (filters.startDate || filters.endDate) {
        query.createdAt = {};
        if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
        if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
    }

    if (filters.search) {
        const searchRegex = { $regex: filters.search, $options: "i" };
        query.$or = [{ action: searchRegex }, { description: searchRegex }, { module: searchRegex }];
    }

    const sortOrder = pagination.sortOrder === "asc" ? 1 : -1;
    const sortBy = pagination.sortBy || "createdAt";
    const sortOptions: any = { [sortBy]: sortOrder };

    const [logs, total] = await Promise.all([ActivityLogModel.find(query).sort(sortOptions).skip(skip).limit(limit).lean(), ActivityLogModel.countDocuments(query)]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
        logs,
        meta: {
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
        },
    };
};

const getAllLogs = async (filters: IActivityLogFilter, pagination: IPaginationOptions) => {
    const page = Math.max(1, Number(pagination.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(pagination.limit) || 10));
    const skip = (page - 1) * limit;

    const query: any = {};

    if (filters.userId && Types.ObjectId.isValid(filters.userId)) {
        query.user = new Types.ObjectId(filters.userId);
    }

    if (filters.action) {
        query.action = { $regex: filters.action, $options: "i" };
    }

    if (filters.module) {
        query.module = filters.module.toUpperCase();
    }

    if (filters.status) {
        query.status = filters.status.toUpperCase();
    }

    if (filters.startDate || filters.endDate) {
        query.createdAt = {};
        if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
        if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
    }

    if (filters.search) {
        const searchRegex = { $regex: filters.search, $options: "i" };
        query.$or = [{ action: searchRegex }, { description: searchRegex }, { module: searchRegex }, { ipAddress: searchRegex }];
    }

    const sortOrder = pagination.sortOrder === "asc" ? 1 : -1;
    const sortBy = pagination.sortBy || "createdAt";
    const sortOptions: any = { [sortBy]: sortOrder };

    const [logs, total] = await Promise.all([ActivityLogModel.find(query).populate("user", "name email role profileImage").sort(sortOptions).skip(skip).limit(limit).lean(), ActivityLogModel.countDocuments(query)]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
        logs,
        meta: {
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
        },
    };
};

const getLogById = async (id: string) => {
    if (!Types.ObjectId.isValid(id)) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Invalid activity log ID");
    }

    const log = await ActivityLogModel.findById(id).populate("user", "name email role profileImage");

    if (!log) {
        throw new ApiError(httpStatus.NOT_FOUND, "Activity log not found");
    }

    return log;
};

const deleteLogById = async (id: string) => {
    if (!Types.ObjectId.isValid(id)) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Invalid activity log ID");
    }

    const log = await ActivityLogModel.findByIdAndDelete(id);

    if (!log) {
        throw new ApiError(httpStatus.NOT_FOUND, "Activity log not found");
    }

    return log;
};

const deleteOldLogs = async (days: number = 90) => {
    const validDays = Math.max(1, Number(days) || 90);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - validDays);

    const result = await ActivityLogModel.deleteMany({
        createdAt: { $lt: cutoffDate },
    });

    return {
        deletedCount: result.deletedCount,
        cutoffDate,
        days: validDays,
    };
};

export const activityLogServices = {
    parseUserAgent,
    createActivityLog,
    getMyLogs,
    getAllLogs,
    getLogById,
    deleteLogById,
    deleteOldLogs,
};
