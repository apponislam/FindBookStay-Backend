import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";
import { settingsServices } from "./settings.services";

const getMySettings = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user._id.toString();

    const result = await settingsServices.getMySettings(userId);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Settings retrieved successfully.",
        data: result,
    });
});

const updateMySettings = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user._id.toString();

    const result = await settingsServices.updateMySettings(userId, req.body);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Settings updated successfully.",
        data: result,
    });
});

const resetMySettings = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user._id.toString();

    const result = await settingsServices.resetMySettings(userId);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Settings reset to default values successfully.",
        data: result,
    });
});

const getUserSettings = catchAsync(async (req: Request, res: Response) => {
    const targetUserId = req.params.userId as string;

    const result = await settingsServices.getUserSettings(targetUserId);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "User settings retrieved successfully.",
        data: result,
    });
});

export const settingsControllers = {
    getMySettings,
    updateMySettings,
    resetMySettings,
    getUserSettings,
};

