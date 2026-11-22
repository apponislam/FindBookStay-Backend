import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";
import { userAddressServices } from "./userAddress.services";

const createUserAddress = catchAsync(async (req: Request, res: Response) => {
    const userId = (req.user as any)?._id?.toString();
    const result = await userAddressServices.createUserAddress(userId, req.body);

    sendResponse(res, {
        statusCode: httpStatus.CREATED,
        success: true,
        message: "User address saved successfully.",
        data: result,
    });
});

const getMyUserAddresses = catchAsync(async (req: Request, res: Response) => {
    const userId = (req.user as any)?._id?.toString();
    const result = await userAddressServices.getMyUserAddresses(userId);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Saved user addresses retrieved successfully.",
        data: result,
    });
});

const getUserAddressById = catchAsync(async (req: Request, res: Response) => {
    const userId = (req.user as any)?._id?.toString();
    const addressId = req.params.id as string;
    const result = await userAddressServices.getUserAddressById(userId, addressId);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Saved address retrieved successfully.",
        data: result,
    });
});

const updateUserAddress = catchAsync(async (req: Request, res: Response) => {
    const userId = (req.user as any)?._id?.toString();
    const addressId = req.params.id as string;
    const result = await userAddressServices.updateUserAddress(userId, addressId, req.body);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Saved address updated successfully.",
        data: result,
    });
});

const setDefaultUserAddress = catchAsync(async (req: Request, res: Response) => {
    const userId = (req.user as any)?._id?.toString();
    const addressId = req.params.id as string;
    const result = await userAddressServices.setDefaultUserAddress(userId, addressId);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Default address updated successfully.",
        data: result,
    });
});

const deleteUserAddress = catchAsync(async (req: Request, res: Response) => {
    const userId = (req.user as any)?._id?.toString();
    const addressId = req.params.id as string;
    const result = await userAddressServices.deleteUserAddress(userId, addressId);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: result.message,
        data: null,
    });
});

export const userAddressControllers = {
    createUserAddress,
    getMyUserAddresses,
    getUserAddressById,
    updateUserAddress,
    setDefaultUserAddress,
    deleteUserAddress,
};
