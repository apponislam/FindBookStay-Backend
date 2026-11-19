import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";
import { favoriteServices } from "./favorite.services";

const toggleFavorite = catchAsync(async (req: Request, res: Response) => {
    const userId = (req.user as any)?._id?.toString();
    const { listing } = req.body;

    const result = await favoriteServices.toggleFavorite(userId, listing);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: result.message,
        data: result,
    });
});

const getMyFavorites = catchAsync(async (req: Request, res: Response) => {
    const userId = (req.user as any)?._id?.toString();
    const result = await favoriteServices.getMyFavorites(userId, req.query);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Favorites retrieved successfully.",
        meta: result.meta,
        data: result.data,
    });
});

const updateFavoriteNote = catchAsync(async (req: Request, res: Response) => {
    const userId = (req.user as any)?._id?.toString();
    const listingId = req.params.listingId as string;
    const { note } = req.body;

    const result = await favoriteServices.updateFavoriteNote(userId, listingId, note);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Favorite note updated successfully.",
        data: result,
    });
});

export const favoriteControllers = {
    toggleFavorite,
    getMyFavorites,
    updateFavoriteNote,
};
