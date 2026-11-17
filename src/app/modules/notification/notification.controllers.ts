import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";
import { notificationServices } from "./notification.services";

const getMyNotifications = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user._id.toString();

    const result = await notificationServices.getMyNotifications(userId, req.query);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Notifications retrieved successfully.",
        meta: result.meta,
        data: result.data,
    });
});

const getUnreadCount = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user._id.toString();

    const result = await notificationServices.getUnreadCount(userId);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Unread count retrieved successfully.",
        data: result,
    });
});

const markAsRead = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user._id.toString();
    const notificationId = req.params.id as string;

    const result = await notificationServices.markAsRead(notificationId, userId);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Notification marked as read successfully.",
        data: result,
    });
});

const markAllAsRead = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user._id.toString();

    const result = await notificationServices.markAllAsRead(userId);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: result.message,
        data: result,
    });
});

const deleteNotification = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user._id.toString();
    const notificationId = req.params.id as string;

    const result = await notificationServices.deleteNotification(notificationId, userId);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: result.message,
        data: null,
    });
});

const clearAllNotifications = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user._id.toString();

    const result = await notificationServices.clearAllNotifications(userId);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: result.message,
        data: null,
    });
});

const sendCustomNotification = catchAsync(async (req: Request, res: Response) => {
    const senderId = req.user._id.toString();

    const result = await notificationServices.sendCustomNotification(senderId, req.body);

    sendResponse(res, {
        statusCode: httpStatus.CREATED,
        success: true,
        message: "Notification dispatched successfully.",
        data: result,
    });
});

export const notificationControllers = {
    getMyNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    sendCustomNotification,
};

