import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";
import { turfServices } from "./turf.services";

const createTurf = catchAsync(async (req: Request, res: Response) => {
    const userId = (req.user as any)?._id?.toString();
    const userRole = (req.user as any)?.role || "USER";
    const meta = {
        ip: req.ip,
        userAgent: req.get("user-agent"),
    };

    const result = await turfServices.createTurf(userId, userRole, req.body, meta);

    sendResponse(res, {
        statusCode: httpStatus.CREATED,
        success: true,
        message:
            userRole === "ADMIN"
                ? "Turf listing published and activated successfully."
                : "Turf listing submitted successfully. It will be reviewed by our team shortly.",
        data: result,
    });
});

const getAllTurfs = catchAsync(async (req: Request, res: Response) => {
    const user = req.user as any;
    const reqUser = user?._id ? { _id: user._id.toString(), role: user.role } : undefined;
    const result = await turfServices.getAllTurfs(req.query, reqUser);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Turf listings retrieved successfully.",
        meta: result.meta,
        data: result.data,
    });
});

const getFeaturedTurfs = catchAsync(async (req: Request, res: Response) => {
    const limit = req.query.limit ? Number(req.query.limit) : 8;
    const result = await turfServices.getFeaturedTurfs(limit);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Featured turf listings retrieved successfully.",
        data: result,
    });
});

const getTurfStats = catchAsync(async (_req: Request, res: Response) => {
    const result = await turfServices.getTurfStats();

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Turf statistics retrieved successfully.",
        data: result,
    });
});

const getMyTurfs = catchAsync(async (req: Request, res: Response) => {
    const userId = (req.user as any)?._id?.toString();
    const result = await turfServices.getMyTurfs(userId, req.query);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "My turf listings retrieved successfully.",
        meta: result.meta,
        data: result.data,
    });
});

const getTurfByIdOrSlug = catchAsync(async (req: Request, res: Response) => {
    const idOrSlug = req.params.idOrSlug as string;
    const user = req.user as any;
    const reqUser = user?._id ? { _id: user._id.toString(), role: user.role } : undefined;
    const meta = {
        ip: req.ip || (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress,
        userAgent: req.get("user-agent"),
        visitorId: (req.headers["x-visitor-id"] as string) || (req.query.visitorId as string),
    };

    const result = await turfServices.getTurfByIdOrSlug(idOrSlug, reqUser, meta);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Turf details retrieved successfully.",
        data: result,
    });
});

const updateTurf = catchAsync(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const userId = (req.user as any)?._id?.toString();
    const userRole = (req.user as any)?.role || "USER";
    const meta = {
        ip: req.ip,
        userAgent: req.get("user-agent"),
    };

    const result = await turfServices.updateTurf(id, userId, userRole, req.body, meta);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Turf listing updated successfully.",
        data: result,
    });
});

const updateAvailabilityStatus = catchAsync(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const userId = (req.user as any)?._id?.toString();
    const userRole = (req.user as any)?.role || "USER";

    const result = await turfServices.updateAvailabilityStatus(id, userId, userRole, req.body.availabilityStatus);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Turf availability status updated successfully.",
        data: result,
    });
});

const deleteTurf = catchAsync(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const userId = (req.user as any)?._id?.toString();
    const userRole = (req.user as any)?.role || "USER";
    const meta = {
        ip: req.ip,
        userAgent: req.get("user-agent"),
    };

    const result = await turfServices.deleteTurf(id, userId, userRole, meta);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: result.message,
        data: result,
    });
});

const approveOrRejectTurf = catchAsync(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const adminId = (req.user as any)?._id?.toString();
    const meta = {
        ip: req.ip,
        userAgent: req.get("user-agent"),
    };

    const result = await turfServices.approveOrRejectTurf(id, adminId, req.body, meta);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message:
            req.body.action === "APPROVE"
                ? "Turf listing approved and published successfully."
                : "Turf listing rejected.",
        data: result,
    });
});

const toggleFeatureStatus = catchAsync(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const result = await turfServices.toggleFeatureStatus(id);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: `Turf listing ${result.isFeatured ? "marked as featured" : "removed from featured"}.`,
        data: result,
    });
});

const toggleVerification = catchAsync(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const result = await turfServices.toggleVerification(id);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: `Turf listing ${result.isVerified ? "marked as verified" : "verification removed"}.`,
        data: result,
    });
});

export const turfControllers = {
    createTurf,
    getAllTurfs,
    getFeaturedTurfs,
    getTurfStats,
    getMyTurfs,
    getTurfByIdOrSlug,
    updateTurf,
    updateAvailabilityStatus,
    deleteTurf,
    approveOrRejectTurf,
    toggleFeatureStatus,
    toggleVerification,
};

