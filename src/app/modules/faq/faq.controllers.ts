import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";
import { faqServices } from "./faq.services";

const createFAQ = catchAsync(async (req: Request, res: Response) => {
    const adminId = (req.user as any)?._id?.toString();
    const result = await faqServices.createFAQ(req.body, adminId);

    sendResponse(res, {
        statusCode: httpStatus.CREATED,
        success: true,
        message: "FAQ created successfully.",
        data: result,
    });
});

const getAllFAQs = catchAsync(async (req: Request, res: Response) => {
    const isAdmin = (req.user as any)?.role === "ADMIN";
    const result = await faqServices.getAllFAQs(req.query, isAdmin);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "FAQs retrieved successfully.",
        meta: result.meta,
        data: result.data,
    });
});

const getFAQById = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await faqServices.getFAQById(id as string);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "FAQ details retrieved successfully.",
        data: result,
    });
});

const updateFAQ = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const adminId = (req.user as any)?._id?.toString();
    const result = await faqServices.updateFAQ(id as string, req.body, adminId);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "FAQ updated successfully.",
        data: result,
    });
});

const deleteFAQ = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const hardDelete = req.query.hardDelete === "true";
    const result = await faqServices.deleteFAQ(id as string, hardDelete);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: result.message,
        data: null,
    });
});

const reorderFAQs = catchAsync(async (req: Request, res: Response) => {
    const { items } = req.body;
    const result = await faqServices.reorderFAQs(items);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: result.message,
        data: null,
    });
});

const submitFAQFeedback = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { type } = req.body;
    const result = await faqServices.submitFAQFeedback(id as string, type);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: result.message,
        data: result.data,
    });
});

const getFAQStats = catchAsync(async (_req: Request, res: Response) => {
    const result = await faqServices.getFAQStats();

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "FAQ statistics retrieved successfully.",
        data: result,
    });
});

export const faqControllers = {
    createFAQ,
    getAllFAQs,
    getFAQById,
    updateFAQ,
    deleteFAQ,
    reorderFAQs,
    submitFAQFeedback,
    getFAQStats,
};

