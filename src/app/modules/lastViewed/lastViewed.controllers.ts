import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";
import { lastViewedServices } from "./lastViewed.services";

const recordLastViewed = catchAsync(async (req: Request, res: Response) => {
    const userId = (req.user as any)?._id?.toString();
    const listingId = req.params.listingId || req.body.listingId;
    const { category } = req.body || {};

    const result = await lastViewedServices.recordLastViewed(
        userId,
        listingId,
        category
    );

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Listing added to last viewed history.",
        data: result,
    });
});

const getMyLastViewed = catchAsync(async (req: Request, res: Response) => {
    const userId = (req.user as any)?._id?.toString();
    const result = await lastViewedServices.getMyLastViewed(userId, req.query as any);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Last viewed listings retrieved successfully.",
        data: result,
    });
});

const removeLastViewedItem = catchAsync(async (req: Request, res: Response) => {
    const userId = (req.user as any)?._id?.toString();
    const listingId = req.params.listingId as string;

    const result = await lastViewedServices.removeLastViewedItem(userId, listingId);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Listing removed from last viewed history.",
        data: result,
    });
});

const clearMyLastViewed = catchAsync(async (req: Request, res: Response) => {
    const userId = (req.user as any)?._id?.toString();

    const result = await lastViewedServices.clearMyLastViewed(userId);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Last viewed history cleared successfully.",
        data: result,
    });
});

export const lastViewedControllers = {
    recordLastViewed,
    getMyLastViewed,
    removeLastViewedItem,
    clearMyLastViewed,
};
