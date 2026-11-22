import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";
import { toletServices } from "./tolet.services";

const createTolet = catchAsync(async (req: Request, res: Response) => {
    const userId = (req.user as any)?._id?.toString();
    const result = await toletServices.createTolet(userId, req.body);

    sendResponse(res, {
        statusCode: httpStatus.CREATED,
        success: true,
        message: "To-Let data saved successfully.",
        data: result,
    });
});

const getMyTolets = catchAsync(async (req: Request, res: Response) => {
    const userId = (req.user as any)?._id?.toString();
    const result = await toletServices.getMyTolets(userId);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "To-Let list retrieved successfully.",
        data: result,
    });
});

const getToletById = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await toletServices.getToletById(id as string);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "To-Let data retrieved successfully.",
        data: result,
    });
});

const updateTolet = catchAsync(async (req: Request, res: Response) => {
    const userId = (req.user as any)?._id?.toString();
    const { id } = req.params;
    const result = await toletServices.updateTolet(userId, id as string, req.body);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "To-Let data updated successfully.",
        data: result,
    });
});

const deleteTolet = catchAsync(async (req: Request, res: Response) => {
    const userId = (req.user as any)?._id?.toString();
    const { id } = req.params;
    const result = await toletServices.deleteTolet(userId, id as string);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: result.message,
        data: null,
    });
});

export const toletControllers = {
    createTolet,
    getMyTolets,
    getToletById,
    updateTolet,
    deleteTolet,
};
