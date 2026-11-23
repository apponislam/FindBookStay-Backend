import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";
import { propertyServices } from "./property.services";

const createProperty = catchAsync(async (req: Request, res: Response) => {
    const userId = (req.user as any)?._id?.toString();
    const userRole = (req.user as any)?.role || "USER";
    const meta = {
        ip: req.ip,
        userAgent: req.get("user-agent"),
    };

    const result = await propertyServices.createProperty(userId, userRole, req.body, meta);

    sendResponse(res, {
        statusCode: httpStatus.CREATED,
        success: true,
        message:
            userRole === "ADMIN"
                ? "Property listing published and activated successfully."
                : "Property listing submitted successfully. It will be reviewed by our team shortly.",
        data: result,
    });
});

const getAllProperties = catchAsync(async (req: Request, res: Response) => {
    const user = req.user as any;
    const reqUser = user?._id ? { _id: user._id.toString(), role: user.role } : undefined;
    const result = await propertyServices.getAllProperties(req.query, reqUser);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Property listings retrieved successfully.",
        meta: result.meta,
        data: result.data,
    });
});

const getFeaturedProperties = catchAsync(async (req: Request, res: Response) => {
    const limit = req.query.limit ? Number(req.query.limit) : 8;
    const result = await propertyServices.getFeaturedProperties(limit);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Featured property listings retrieved successfully.",
        data: result,
    });
});

const getPropertyStats = catchAsync(async (_req: Request, res: Response) => {
    const result = await propertyServices.getPropertyStats();

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Property statistics retrieved successfully.",
        data: result,
    });
});

const getMyProperties = catchAsync(async (req: Request, res: Response) => {
    const userId = (req.user as any)?._id?.toString();
    const result = await propertyServices.getMyProperties(userId, req.query);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "My property listings retrieved successfully.",
        meta: result.meta,
        data: result.data,
    });
});

const getPropertyByIdOrSlug = catchAsync(async (req: Request, res: Response) => {
    const idOrSlug = req.params.idOrSlug as string;
    const user = req.user as any;
    const reqUser = user?._id ? { _id: user._id.toString(), role: user.role } : undefined;
    const meta = {
        ip: req.ip || (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress,
        userAgent: req.get("user-agent"),
        visitorId: (req.headers["x-visitor-id"] as string) || (req.query.visitorId as string),
    };

    const result = await propertyServices.getPropertyByIdOrSlug(idOrSlug, reqUser, meta);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Property details retrieved successfully.",
        data: result,
    });
});

const updateProperty = catchAsync(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const userId = (req.user as any)?._id?.toString();
    const userRole = (req.user as any)?.role || "USER";
    const meta = {
        ip: req.ip,
        userAgent: req.get("user-agent"),
    };

    const result = await propertyServices.updateProperty(id, userId, userRole, req.body, meta);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Property listing updated successfully.",
        data: result,
    });
});

const updateAvailabilityStatus = catchAsync(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const userId = (req.user as any)?._id?.toString();
    const userRole = (req.user as any)?.role || "USER";

    const result = await propertyServices.updateAvailabilityStatus(id, userId, userRole, req.body.availabilityStatus);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Property availability status updated successfully.",
        data: result,
    });
});

const deleteProperty = catchAsync(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const userId = (req.user as any)?._id?.toString();
    const userRole = (req.user as any)?.role || "USER";
    const meta = {
        ip: req.ip,
        userAgent: req.get("user-agent"),
    };

    const result = await propertyServices.deleteProperty(id, userId, userRole, meta);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: result.message,
        data: result,
    });
});

const approveOrRejectProperty = catchAsync(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const adminId = (req.user as any)?._id?.toString();
    const meta = {
        ip: req.ip,
        userAgent: req.get("user-agent"),
    };

    const result = await propertyServices.approveOrRejectProperty(id, adminId, req.body, meta);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message:
            req.body.action === "APPROVE"
                ? "Property listing approved and published successfully."
                : "Property listing rejected.",
        data: result,
    });
});

const toggleFeatureStatus = catchAsync(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const result = await propertyServices.toggleFeatureStatus(id);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: `Property listing ${result.isFeatured ? "marked as featured" : "removed from featured"}.`,
        data: result,
    });
});

const toggleVerification = catchAsync(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const result = await propertyServices.toggleVerification(id);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: `Property listing ${result.isVerified ? "marked as verified" : "verification removed"}.`,
        data: result,
    });
});

export const propertyControllers = {
    createProperty,
    getAllProperties,
    getFeaturedProperties,
    getPropertyStats,
    getMyProperties,
    getPropertyByIdOrSlug,
    updateProperty,
    updateAvailabilityStatus,
    deleteProperty,
    approveOrRejectProperty,
    toggleFeatureStatus,
    toggleVerification,
};

