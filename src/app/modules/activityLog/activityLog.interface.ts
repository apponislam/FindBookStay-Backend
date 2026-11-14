import { Types } from "mongoose";

export type ActivityLogStatus = "SUCCESS" | "FAILED" | "WARNING" | "INFO";

export type ActivityLogModule =
    | "AUTH"
    | "HOME"
    | "STAY"
    | "TURF"
    | "PROPERTY"
    | "USER"
    | "PAYMENT"
    | "SYSTEM"
    | (string & {});

export interface IActivityLog {
    user?: Types.ObjectId | null;
    role?: string | null;
    action: string;
    module: ActivityLogModule;
    description: string;
    status: ActivityLogStatus;
    ipAddress?: string | null;
    userAgent?: string | null;
    device?: string | null;
    browser?: string | null;
    os?: string | null;
    metadata?: Record<string, any>;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface IActivityLogFilter {
    search?: string;
    userId?: string;
    module?: string;
    action?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
}

export interface IPaginationOptions {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
}
