import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";
import { conversationServices } from "./conversation.services";

const createOrGetConversation = catchAsync(async (req: Request, res: Response) => {
    const { recipientId, listingId, initialMessage } = req.body;
    const userId = req.user._id.toString();

    const result = await conversationServices.createOrGetConversation(userId, recipientId, listingId, initialMessage);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Conversation retrieved or created successfully.",
        data: result,
    });
});

const getUserConversations = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user._id.toString();
    const result = await conversationServices.getUserConversations(userId, req.query);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Conversations retrieved successfully.",
        meta: result.meta,
        data: result.data,
    });
});

const getConversationById = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user._id.toString();
    const result = await conversationServices.getConversationById(req.params.id as string, userId);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Conversation details retrieved successfully.",
        data: result,
    });
});

const toggleArchiveConversation = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user._id.toString();
    const result = await conversationServices.toggleArchiveConversation(req.params.id as string, userId);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: result.message,
        data: { isArchived: result.isArchived },
    });
});

const toggleBlockConversation = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user._id.toString();
    const result = await conversationServices.toggleBlockConversation(req.params.id as string, userId);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: result.message,
        data: { isBlocked: result.isBlocked },
    });
});

export const conversationControllers = {
    createOrGetConversation,
    getUserConversations,
    getConversationById,
    toggleArchiveConversation,
    toggleBlockConversation,
};
