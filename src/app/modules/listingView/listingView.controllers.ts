import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";
import { listingViewServices } from "./listingView.services";

const getListingViewAnalytics = catchAsync(async (req: Request, res: Response) => {
    const listingId = req.params.listingId as string;
    const user = req.user as any;
    const reqUser = { _id: user._id.toString(), role: user.role };

    const result = await listingViewServices.getListingViewAnalytics(listingId, reqUser);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Listing view analytics retrieved successfully.",
        data: result,
    });
});

export const listingViewControllers = {
    getListingViewAnalytics,
};
