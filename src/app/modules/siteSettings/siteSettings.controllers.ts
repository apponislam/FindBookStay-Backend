import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";
import { siteSettingsServices } from "./siteSettings.services";

const getSiteSettings = catchAsync(async (req: Request, res: Response) => {
    const result = await siteSettingsServices.getSiteSettings();

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Site settings retrieved successfully.",
        data: result,
    });
});

const updateSiteSettings = catchAsync(async (req: Request, res: Response) => {
    const adminId = req.user._id.toString();

    const result = await siteSettingsServices.updateSiteSettings(adminId, req.body);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Site settings updated successfully.",
        data: result,
    });
});

export const siteSettingsControllers = {
    getSiteSettings,
    updateSiteSettings,
};

