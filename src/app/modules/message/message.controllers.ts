import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";
import { messageServices } from "./message.services";

const sendMessage = catchAsync(async (req: Request, res: Response) => {
    const senderId = req.user._id.toString();

    const result = await messageServices.sendMessage(senderId, req.body);

    sendResponse(res, {
        statusCode: httpStatus.CREATED,
        success: true,
        message: "Message sent successfully.",
        data: result,
    });
});

const getConversationMessages = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user._id.toString();
    const conversationId = req.params.conversationId as string;

    const result = await messageServices.getConversationMessages(conversationId, userId, req.query);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Messages retrieved successfully.",
        meta: result.meta,
        data: result.data,
    });
});

const syncMessages = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user._id.toString();
    const conversationId = req.params.conversationId as string;
    const since = req.query.since as string | undefined;

    const result = await messageServices.syncMessages(conversationId, userId, since);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Messages synced successfully.",
        meta: result.meta,
        data: result.data,
    });
});

const markMessagesAsRead = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user._id.toString();
    const conversationId = req.params.conversationId as string;

    const result = await messageServices.markMessagesAsRead(conversationId, userId);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: result.message,
        data: result,
    });
});

const deleteMessage = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user._id.toString();
    const messageId = req.params.id as string;
    const deleteForEveryone = req.query.forEveryone === "true";

    const result = await messageServices.deleteMessage(messageId, userId, deleteForEveryone);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: result.message,
        data: null,
    });
});

export const messageControllers = {
    sendMessage,
    getConversationMessages,
    syncMessages,
    markMessagesAsRead,
    deleteMessage,
};
