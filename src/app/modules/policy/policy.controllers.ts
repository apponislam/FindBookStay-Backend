import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";
import { policyServices } from "./policy.services";

const createOrUpdatePolicy = catchAsync(async (req: Request, res: Response) => {
    const adminId = req.user?._id;
    const result = await policyServices.createOrUpdatePolicy(req.body, adminId);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Policy saved successfully.",
        data: result,
    });
});

const getAllPolicies = catchAsync(async (req: Request, res: Response) => {
    const result = await policyServices.getAllPolicies(req.query);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Policies retrieved successfully.",
        data: result,
    });
});

const getPolicyByTypeOrSlug = catchAsync(async (req: Request, res: Response) => {
    const typeOrSlug = req.params.typeOrSlug as string;
    const result = await policyServices.getPolicyByTypeOrSlug(typeOrSlug);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Policy retrieved successfully.",
        data: result,
    });
});

const updatePolicyById = catchAsync(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const adminId = req.user?._id;
    const result = await policyServices.updatePolicyById(id, req.body, adminId);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Policy updated successfully.",
        data: result,
    });
});

const deletePolicyById = catchAsync(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const result = await policyServices.deletePolicyById(id);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Policy deleted successfully.",
        data: result,
    });
});

export const policyControllers = {
    createOrUpdatePolicy,
    getAllPolicies,
    getPolicyByTypeOrSlug,
    updatePolicyById,
    deletePolicyById,
};
