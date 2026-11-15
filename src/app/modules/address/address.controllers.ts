import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";
import { addressServices } from "./address.services";

const createAddress = catchAsync(async (req: Request, res: Response) => {
    const result = await addressServices.createAddress(req.body);

    sendResponse(res, {
        statusCode: httpStatus.CREATED,
        success: true,
        message: "Address created successfully.",
        data: result,
    });
});

const getAllAddresses = catchAsync(async (req: Request, res: Response) => {
    const result = await addressServices.getAllAddresses(req.query);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Addresses retrieved successfully.",
        data: result,
    });
});

const getAddressById = catchAsync(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const result = await addressServices.getAddressById(id);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Address details retrieved successfully.",
        data: result,
    });
});

const getChildrenByParentId = catchAsync(async (req: Request, res: Response) => {
    const parentId = req.params.parentId as string;
    const result = await addressServices.getChildrenByParentId(parentId);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Child locations retrieved successfully.",
        data: result,
    });
});

const getAddressTree = catchAsync(async (req: Request, res: Response) => {
    const result = await addressServices.getAddressTree();

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Address hierarchy tree retrieved successfully.",
        data: result,
    });
});

const getParentsByAddressId = catchAsync(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const result = await addressServices.getParentsByAddressId(id);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Location hierarchy lineage retrieved successfully.",
        data: result,
    });
});

const updateAddress = catchAsync(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const result = await addressServices.updateAddress(id, req.body);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Address updated successfully.",
        data: result,
    });
});

const deleteAddress = catchAsync(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const result = await addressServices.deleteAddress(id);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Address deleted successfully.",
        data: result,
    });
});

export const addressControllers = {
    createAddress,
    getAllAddresses,
    getAddressById,
    getChildrenByParentId,
    getAddressTree,
    getParentsByAddressId,
    updateAddress,
    deleteAddress,
};
