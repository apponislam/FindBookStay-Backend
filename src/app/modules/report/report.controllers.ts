import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";
import { reportServices } from "./report.services";

const createReport = catchAsync(async (req: Request, res: Response) => {
    const userId = (req.user as any)?._id?.toString();
    const meta = {
        ip: req.ip,
        userAgent: req.get("user-agent"),
    };

    const result = await reportServices.createReport(userId, req.body, meta);

    sendResponse(res, {
        statusCode: httpStatus.CREATED,
        success: true,
        message: "Report submitted successfully. Our Trust & Safety team will review it.",
        data: result,
    });
});

const getMyReports = catchAsync(async (req: Request, res: Response) => {
    const userId = (req.user as any)?._id?.toString();
    const result = await reportServices.getMyReports(userId, req.query);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Your reports retrieved successfully.",
        meta: result.meta,
        data: result.data,
    });
});

const getAllReports = catchAsync(async (req: Request, res: Response) => {
    const result = await reportServices.getAllReports(req.query);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "All reports retrieved successfully.",
        meta: result.meta,
        data: result.data,
    });
});

const getReportById = catchAsync(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const userId = (req.user as any)?._id?.toString();
    const userRole = (req.user as any)?.role || "USER";

    const result = await reportServices.getReportById(id, userId, userRole);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Report details retrieved successfully.",
        data: result,
    });
});

const resolveReport = catchAsync(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const adminId = (req.user as any)?._id?.toString();
    const meta = {
        ip: req.ip,
        userAgent: req.get("user-agent"),
    };

    const result = await reportServices.resolveReport(id, adminId, req.body, meta);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: `Report marked as ${result.status}.`,
        data: result,
    });
});

const getReportStats = catchAsync(async (_req: Request, res: Response) => {
    const result = await reportServices.getReportStats();

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Report statistics retrieved successfully.",
        data: result,
    });
});

export const reportControllers = {
    createReport,
    getMyReports,
    getAllReports,
    getReportById,
    resolveReport,
    getReportStats,
};

