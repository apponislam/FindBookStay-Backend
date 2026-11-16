import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";
import { reviewServices } from "./review.services";

const createReview = catchAsync(async (req: Request, res: Response) => {
    const userId = (req.user as any)?._id?.toString();
    const meta = {
        ip: req.ip,
        userAgent: req.get("user-agent"),
    };

    const result = await reviewServices.createReview(userId, req.body, meta);

    sendResponse(res, {
        statusCode: httpStatus.CREATED,
        success: true,
        message: "Review submitted successfully. Thank you for your feedback!",
        data: result,
    });
});

const getReviewsByListing = catchAsync(async (req: Request, res: Response) => {
    const listingId = req.params.listingId as string;
    const result = await reviewServices.getReviewsByListing(listingId, req.query);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Reviews retrieved successfully.",
        meta: {
            ...result.meta,
            ratingBreakdown: result.ratingBreakdown,
        },
        data: result.data,
    });
});

const getMyReviews = catchAsync(async (req: Request, res: Response) => {
    const userId = (req.user as any)?._id?.toString();
    const result = await reviewServices.getMyReviews(userId, req.query);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "My reviews retrieved successfully.",
        meta: result.meta,
        data: result.data,
    });
});

const updateReview = catchAsync(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const userId = (req.user as any)?._id?.toString();
    const userRole = (req.user as any)?.role || "USER";
    const meta = {
        ip: req.ip,
        userAgent: req.get("user-agent"),
    };

    const result = await reviewServices.updateReview(id, userId, userRole, req.body, meta);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Review updated successfully.",
        data: result,
    });
});

const deleteReview = catchAsync(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const userId = (req.user as any)?._id?.toString();
    const userRole = (req.user as any)?.role || "USER";
    const meta = {
        ip: req.ip,
        userAgent: req.get("user-agent"),
    };

    const result = await reviewServices.deleteReview(id, userId, userRole, meta);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: result.message,
        data: result,
    });
});

const replyToReview = catchAsync(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const userId = (req.user as any)?._id?.toString();
    const userRole = (req.user as any)?.role || "USER";
    const { comment } = req.body;

    const result = await reviewServices.replyToReview(id, userId, userRole, comment);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Reply added successfully.",
        data: result,
    });
});

const getAllReviews = catchAsync(async (req: Request, res: Response) => {
    const result = await reviewServices.getAllReviews(req.query);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "All reviews retrieved successfully.",
        meta: result.meta,
        data: result.data,
    });
});

export const reviewControllers = {
    createReview,
    getReviewsByListing,
    getMyReviews,
    updateReview,
    deleteReview,
    replyToReview,
    getAllReviews,
};
