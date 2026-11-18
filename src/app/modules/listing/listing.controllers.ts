import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";
import { listingServices } from "./listing.services";
import { ListingCategory, AvailabilityStatus } from "./listing.interface";

const createListing = catchAsync(async (req: Request, res: Response) => {
    const userId = (req.user as any)?._id?.toString();
    const userRole = (req.user as any)?.role || "USER";
    const meta = {
        ip: req.ip,
        userAgent: req.get("user-agent"),
    };

    const result = await listingServices.createListing(userId, userRole, req.body, meta);

    sendResponse(res, {
        statusCode: httpStatus.CREATED,
        success: true,
        message:
            userRole === "ADMIN"
                ? "Listing published and activated successfully."
                : "Listing submitted successfully. It will be reviewed by our team shortly.",
        data: result,
    });
});

const getAllListings = catchAsync(async (req: Request, res: Response) => {
    const user = req.user as any;
    const reqUser = user?._id ? { _id: user._id.toString(), role: user.role } : undefined;
    const result = await listingServices.getAllListings(req.query, reqUser);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Listings retrieved successfully.",
        meta: result.meta,
        data: result.data,
    });
});

const getFeaturedListings = catchAsync(async (req: Request, res: Response) => {
    const category = req.query.category as ListingCategory | undefined;
    const limit = req.query.limit ? Number(req.query.limit) : 8;

    const result = await listingServices.getFeaturedListings(category, limit);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Featured listings retrieved successfully.",
        data: result,
    });
});

const getListingStats = catchAsync(async (_req: Request, res: Response) => {
    const result = await listingServices.getListingStats();

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Listing statistics retrieved successfully.",
        data: result,
    });
});

const getMyListings = catchAsync(async (req: Request, res: Response) => {
    const userId = (req.user as any)?._id?.toString();
    const result = await listingServices.getMyListings(userId, req.query);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "My listings retrieved successfully.",
        meta: result.meta,
        data: result.data,
    });
});

const getListingByIdOrSlug = catchAsync(async (req: Request, res: Response) => {
    const idOrSlug = req.params.idOrSlug as string;
    const user = req.user as any;
    const reqUser = user?._id ? { _id: user._id.toString(), role: user.role } : undefined;
    const meta = {
        ip: req.ip || (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress,
        userAgent: req.get("user-agent"),
        visitorId: (req.headers["x-visitor-id"] as string) || (req.query.visitorId as string),
    };

    const result = await listingServices.getListingByIdOrSlug(idOrSlug, reqUser, meta);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Listing details retrieved successfully.",
        data: result,
    });
});

const updateListing = catchAsync(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const userId = (req.user as any)?._id?.toString();
    const userRole = (req.user as any)?.role || "USER";
    const meta = {
        ip: req.ip,
        userAgent: req.get("user-agent"),
    };

    const result = await listingServices.updateListing(id, userId, userRole, req.body, meta);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Listing updated successfully.",
        data: result,
    });
});

const deleteListing = catchAsync(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const userId = (req.user as any)?._id?.toString();
    const userRole = (req.user as any)?.role || "USER";
    const meta = {
        ip: req.ip,
        userAgent: req.get("user-agent"),
    };

    const result = await listingServices.deleteListing(id, userId, userRole, meta);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: result.message,
        data: result,
    });
});

const approveOrRejectListing = catchAsync(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const adminId = (req.user as any)?._id?.toString();
    const meta = {
        ip: req.ip,
        userAgent: req.get("user-agent"),
    };

    const result = await listingServices.approveOrRejectListing(id, adminId, req.body, meta);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: `Listing ${req.body.status.toLowerCase()} successfully.`,
        data: result,
    });
});

const toggleFeatureStatus = catchAsync(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const adminId = (req.user as any)?._id?.toString();

    const result = await listingServices.toggleFeatureStatus(id, adminId);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: `Listing featured status changed to ${result.isFeatured}.`,
        data: result,
    });
});

const toggleVerification = catchAsync(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const adminId = (req.user as any)?._id?.toString();

    const result = await listingServices.toggleVerification(id, adminId);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: `Listing verification status changed to ${result.isVerified}.`,
        data: result,
    });
});

const updateAvailabilityStatus = catchAsync(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const userId = (req.user as any)?._id?.toString();
    const userRole = (req.user as any)?.role || "USER";
    const { availabilityStatus } = req.body;

    const result = await listingServices.updateAvailabilityStatus(
        id,
        userId,
        userRole,
        availabilityStatus as AvailabilityStatus
    );

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: `Availability status updated to ${result.availabilityStatus}.`,
        data: result,
    });
});

export const listingControllers = {
    createListing,
    getAllListings,
    getFeaturedListings,
    getListingStats,
    getMyListings,
    getListingByIdOrSlug,
    updateListing,
    deleteListing,
    approveOrRejectListing,
    toggleFeatureStatus,
    toggleVerification,
    updateAvailabilityStatus,
};
