import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";
import { homeServices } from "./home.services";

const createHome = catchAsync(async (req: Request, res: Response) => {
    const userId = (req.user as any)?._id?.toString();
    const userRole = (req.user as any)?.role || "USER";
    const meta = {
        ip: req.ip,
        userAgent: req.get("user-agent"),
    };

    const result = await homeServices.createHome(userId, userRole, req.body, meta);

    sendResponse(res, {
        statusCode: httpStatus.CREATED,
        success: true,
        message:
            userRole === "ADMIN"
                ? "Home listing published and activated successfully."
                : "Home listing submitted successfully. It will be reviewed by our team shortly.",
        data: result,
    });
});

const getAllHomes = catchAsync(async (req: Request, res: Response) => {
    const user = req.user as any;
    const reqUser = user?._id ? { _id: user._id.toString(), role: user.role } : undefined;
    const result = await homeServices.getAllHomes(req.query, reqUser);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Home listings retrieved successfully.",
        meta: result.meta,
        data: result.data,
    });
});

const getFeaturedHomes = catchAsync(async (req: Request, res: Response) => {
    const limit = req.query.limit ? Number(req.query.limit) : 8;
    const result = await homeServices.getFeaturedHomes(limit);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Featured home listings retrieved successfully.",
        data: result,
    });
});

const getHomeStats = catchAsync(async (_req: Request, res: Response) => {
    const result = await homeServices.getHomeStats();

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Home statistics retrieved successfully.",
        data: result,
    });
});

const getMyHomes = catchAsync(async (req: Request, res: Response) => {
    const userId = (req.user as any)?._id?.toString();
    const result = await homeServices.getMyHomes(userId, req.query);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "My home listings retrieved successfully.",
        meta: result.meta,
        data: result.data,
    });
});

const getHomeByIdOrSlug = catchAsync(async (req: Request, res: Response) => {
    const idOrSlug = req.params.idOrSlug as string;
    const user = req.user as any;
    const reqUser = user?._id ? { _id: user._id.toString(), role: user.role } : undefined;
    const meta = {
        ip: req.ip || (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress,
        userAgent: req.get("user-agent"),
        visitorId: (req.headers["x-visitor-id"] as string) || (req.query.visitorId as string),
    };

    const result = await homeServices.getHomeByIdOrSlug(idOrSlug, reqUser, meta);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Home details retrieved successfully.",
        data: result,
    });
});

const updateHome = catchAsync(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const userId = (req.user as any)?._id?.toString();
    const userRole = (req.user as any)?.role || "USER";
    const meta = {
        ip: req.ip,
        userAgent: req.get("user-agent"),
    };

    const result = await homeServices.updateHome(id, userId, userRole, req.body, meta);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Home listing updated successfully.",
        data: result,
    });
});

const updateAvailabilityStatus = catchAsync(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const userId = (req.user as any)?._id?.toString();
    const userRole = (req.user as any)?.role || "USER";

    const result = await homeServices.updateAvailabilityStatus(id, userId, userRole, req.body.availabilityStatus);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Home availability status updated successfully.",
        data: result,
    });
});

const deleteHome = catchAsync(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const userId = (req.user as any)?._id?.toString();
    const userRole = (req.user as any)?.role || "USER";
    const meta = {
        ip: req.ip,
        userAgent: req.get("user-agent"),
    };

    const result = await homeServices.deleteHome(id, userId, userRole, meta);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: result.message,
        data: result,
    });
});

const approveOrRejectHome = catchAsync(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const adminId = (req.user as any)?._id?.toString();
    const meta = {
        ip: req.ip,
        userAgent: req.get("user-agent"),
    };

    const result = await homeServices.approveOrRejectHome(id, adminId, req.body, meta);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message:
            req.body.action === "APPROVE"
                ? "Home listing approved and published successfully."
                : "Home listing rejected.",
        data: result,
    });
});

const toggleFeatureStatus = catchAsync(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const result = await homeServices.toggleFeatureStatus(id);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: `Home listing ${result.isFeatured ? "marked as featured" : "removed from featured"}.`,
        data: result,
    });
});

const toggleVerification = catchAsync(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const result = await homeServices.toggleVerification(id);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: `Home listing ${result.isVerified ? "marked as verified" : "verification removed"}.`,
        data: result,
    });
});

export const homeControllers = {
    createHome,
    getAllHomes,
    getFeaturedHomes,
    getHomeStats,
    getMyHomes,
    getHomeByIdOrSlug,
    updateHome,
    updateAvailabilityStatus,
    deleteHome,
    approveOrRejectHome,
    toggleFeatureStatus,
    toggleVerification,
};

