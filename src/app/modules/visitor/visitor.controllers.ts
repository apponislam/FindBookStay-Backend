import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";
import { visitorServices } from "./visitor.services";

const trackVisitor = catchAsync(async (req: Request, res: Response) => {
    const rawIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || req.socket.remoteAddress || "127.0.0.1";
    const userAgent = req.headers["user-agent"] || "";
    const userId = req.user?._id ? req.user._id.toString() : null;

    // Optional incoming visitorId from body, custom header (mobile apps), or cookies (web browsers)
    const incomingVisitorId =
        (req.body.visitorId && typeof req.body.visitorId === "string" && req.body.visitorId.trim()) ||
        (req.headers["x-visitor-id"] as string) ||
        req.cookies?.visitorId ||
        undefined;

    const platformHeader = ((req.headers["x-platform"] || req.headers["x-client-platform"]) as string | undefined)?.toUpperCase();

    const result = await visitorServices.trackVisitor({
        ...req.body,
        ...(platformHeader && !req.body.platform && { platform: platformHeader }),
        visitorId: incomingVisitorId,
        ipAddress: rawIp,
        userAgent,
        userId,
    });

    // Set persistent 1-year cookie with the generated or existing visitorId
    if (result?.visitorId) {
        res.cookie("visitorId", result.visitorId, {
            httpOnly: false,
            maxAge: 365 * 24 * 60 * 60 * 1000,
            sameSite: "lax",
        });
    }

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Visitor activity recorded successfully.",
        data: result,
    });
});

const getAllVisitors = catchAsync(async (req: Request, res: Response) => {
    const result = await visitorServices.getAllVisitors(req.query);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Visitors retrieved successfully.",
        meta: result.meta,
        data: result.data,
    });
});

const getVisitorAnalytics = catchAsync(async (req: Request, res: Response) => {
    const result = await visitorServices.getVisitorAnalytics(req.query);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Visitor analytics retrieved successfully.",
        data: result,
    });
});

const getVisitorById = catchAsync(async (req: Request, res: Response) => {
    const result = await visitorServices.getVisitorById(req.params.id as string);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Visitor details retrieved successfully.",
        data: result,
    });
});

const deleteVisitor = catchAsync(async (req: Request, res: Response) => {
    const result = await visitorServices.deleteVisitor(req.params.id as string);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: result.message,
        data: null,
    });
});

export const visitorControllers = {
    trackVisitor,
    getAllVisitors,
    getVisitorAnalytics,
    getVisitorById,
    deleteVisitor,
};
