import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";
import { activityLogServices } from "./activityLog.services";

const getMyLogs = catchAsync(async (req: Request, res: Response) => {
    const filters = {
        search: req.query.search as string,
        action: req.query.action as string,
        module: req.query.module as string,
        status: req.query.status as string,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
    };

    const pagination = {
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 10,
        sortBy: req.query.sortBy as string,
        sortOrder: req.query.sortOrder as "asc" | "desc",
    };

    const result = await activityLogServices.getMyLogs(req.user._id, filters, pagination);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "My activity logs retrieved successfully",
        meta: result.meta,
        data: result.logs,
    });
});

const getAllLogs = catchAsync(async (req: Request, res: Response) => {
    const filters = {
        search: req.query.search as string,
        userId: req.query.userId as string,
        action: req.query.action as string,
        module: req.query.module as string,
        status: req.query.status as string,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
    };

    const pagination = {
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 10,
        sortBy: req.query.sortBy as string,
        sortOrder: req.query.sortOrder as "asc" | "desc",
    };

    const result = await activityLogServices.getAllLogs(filters, pagination);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "All activity logs retrieved successfully",
        meta: result.meta,
        data: result.logs,
    });
});

const getLogById = catchAsync(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const result = await activityLogServices.getLogById(id);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Activity log retrieved successfully",
        data: result,
    });
});

const deleteLogById = catchAsync(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const result = await activityLogServices.deleteLogById(id);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Activity log deleted successfully",
        data: result,
    });
});

const deleteOldLogs = catchAsync(async (req: Request, res: Response) => {
    const days = req.body.days || req.query.days ? Number(req.body.days || req.query.days) : 90;
    const result = await activityLogServices.deleteOldLogs(days);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: `Activity logs older than ${result.days} days purged successfully`,
        data: result,
    });
});

export const activityLogControllers = {
    getMyLogs,
    getAllLogs,
    getLogById,
    deleteLogById,
    deleteOldLogs,
};
