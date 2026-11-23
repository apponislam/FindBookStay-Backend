import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";
import { stayServices } from "./stay.services";

const createStay = catchAsync(async (req: Request, res: Response) => {
    const userId = (req.user as any)?._id?.toString();
    const userRole = (req.user as any)?.role || "USER";
    const meta = {
        ip: req.ip,
        userAgent: req.get("user-agent"),
    };

    const result = await stayServices.createStay(userId, userRole, req.body, meta);

    sendResponse(res, {
        statusCode: httpStatus.CREATED,
        success: true,
        message:
            userRole === "ADMIN"
                ? "Stay listing published and activated successfully."
                : "Stay listing submitted successfully. It will be reviewed by our team shortly.",
        data: result,
    });
});

const getAllStays = catchAsync(async (req: Request, res: Response) => {
    const user = req.user as any;
    const reqUser = user?._id ? { _id: user._id.toString(), role: user.role } : undefined;
    const result = await stayServices.getAllStays(req.query, reqUser);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Stay listings retrieved successfully.",
        meta: result.meta,
        data: result.data,
    });
});

const getFeaturedStays = catchAsync(async (req: Request, res: Response) => {
    const limit = req.query.limit ? Number(req.query.limit) : 8;
    const result = await stayServices.getFeaturedStays(limit);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Featured stay listings retrieved successfully.",
        data: result,
    });
});

const getStayStats = catchAsync(async (_req: Request, res: Response) => {
    const result = await stayServices.getStayStats();

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Stay statistics retrieved successfully.",
        data: result,
    });
});

const getMyStays = catchAsync(async (req: Request, res: Response) => {
    const userId = (req.user as any)?._id?.toString();
    const result = await stayServices.getMyStays(userId, req.query);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "My stay listings retrieved successfully.",
        meta: result.meta,
        data: result.data,
    });
});

const getStayByIdOrSlug = catchAsync(async (req: Request, res: Response) => {
    const idOrSlug = req.params.idOrSlug as string;
    const user = req.user as any;
    const reqUser = user?._id ? { _id: user._id.toString(), role: user.role } : undefined;
    const meta = {
        ip: req.ip || (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress,
        userAgent: req.get("user-agent"),
        visitorId: (req.headers["x-visitor-id"] as string) || (req.query.visitorId as string),
    };

    const result = await stayServices.getStayByIdOrSlug(idOrSlug, reqUser, meta);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Stay details retrieved successfully.",
        data: result,
    });
});

const updateStay = catchAsync(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const userId = (req.user as any)?._id?.toString();
    const userRole = (req.user as any)?.role || "USER";
    const meta = {
        ip: req.ip,
        userAgent: req.get("user-agent"),
    };

    const result = await stayServices.updateStay(id, userId, userRole, req.body, meta);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Stay listing updated successfully.",
        data: result,
    });
});

const updateAvailabilityStatus = catchAsync(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const userId = (req.user as any)?._id?.toString();
    const userRole = (req.user as any)?.role || "USER";

    const result = await stayServices.updateAvailabilityStatus(id, userId, userRole, req.body.availabilityStatus);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Stay availability status updated successfully.",
        data: result,
    });
});

const deleteStay = catchAsync(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const userId = (req.user as any)?._id?.toString();
    const userRole = (req.user as any)?.role || "USER";
    const meta = {
        ip: req.ip,
        userAgent: req.get("user-agent"),
    };

    const result = await stayServices.deleteStay(id, userId, userRole, meta);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: result.message,
        data: result,
    });
});

const approveOrRejectStay = catchAsync(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const adminId = (req.user as any)?._id?.toString();
    const meta = {
        ip: req.ip,
        userAgent: req.get("user-agent"),
    };

    const result = await stayServices.approveOrRejectStay(id, adminId, req.body, meta);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message:
            req.body.action === "APPROVE"
                ? "Stay listing approved and published successfully."
                : "Stay listing rejected.",
        data: result,
    });
});

const toggleFeatureStatus = catchAsync(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const result = await stayServices.toggleFeatureStatus(id);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: `Stay listing ${result.isFeatured ? "marked as featured" : "removed from featured"}.`,
        data: result,
    });
});

const toggleVerification = catchAsync(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const result = await stayServices.toggleVerification(id);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: `Stay listing ${result.isVerified ? "marked as verified" : "verification removed"}.`,
        data: result,
    });
});

export const stayControllers = {
    createStay,
    getAllStays,
    getFeaturedStays,
    getStayStats,
    getMyStays,
    getStayByIdOrSlug,
    updateStay,
    updateAvailabilityStatus,
    deleteStay,
    approveOrRejectStay,
    toggleFeatureStatus,
    toggleVerification,
};

