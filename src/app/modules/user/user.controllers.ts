import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";
import { userServices } from "./user.services";

const getAllUsers = catchAsync(async (req: Request, res: Response) => {
    const result = await userServices.getAllUsers(req.query);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Users retrieved successfully.",
        meta: result.meta,
        data: result.data,
    });
});

const getUserStats = catchAsync(async (_req: Request, res: Response) => {
    const result = await userServices.getUserStats();

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "User statistics retrieved successfully.",
        data: result,
    });
});

const getUserById = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await userServices.getUserById(id as string);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "User profile retrieved successfully.",
        data: result,
    });
});

const updateUserStatus = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const adminId = (req.user as any)?._id?.toString();
    const meta = { ip: req.ip, userAgent: req.get("user-agent") };

    const result = await userServices.updateUserStatus(id as string, adminId, req.body, meta);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: `User account has been ${result.isActive ? "enabled" : "disabled"} successfully.`,
        data: result,
    });
});

const changeUserPasswordByAdmin = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const adminId = (req.user as any)?._id?.toString();
    const { newPassword } = req.body;
    const meta = { ip: req.ip, userAgent: req.get("user-agent") };

    const result = await userServices.changeUserPasswordByAdmin(id as string, adminId, newPassword, meta);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: result.message,
        data: result,
    });
});

const updateUserByAdmin = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const adminId = (req.user as any)?._id?.toString();
    const meta = { ip: req.ip, userAgent: req.get("user-agent") };

    const result = await userServices.updateUserByAdmin(id as string, adminId, req.body, meta);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "User profile updated successfully by administrator.",
        data: result,
    });
});

const deleteUserByAdmin = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const adminId = (req.user as any)?._id?.toString();
    const hardDelete = req.query.hardDelete === "true";
    const meta = { ip: req.ip, userAgent: req.get("user-agent") };

    const result = await userServices.deleteUserByAdmin(id as string, adminId, hardDelete, meta);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: result.message,
        data: result,
    });
});

const getUserSessions = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const currentUserId = (req.user as any)?._id?.toString();
    const targetUserId = id === "me" ? currentUserId : (id as string);

    const result = await userServices.getUserSessions(targetUserId);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "User active sessions retrieved successfully.",
        data: result,
    });
});

const terminateUserSession = catchAsync(async (req: Request, res: Response) => {
    const { id, deviceId } = req.params;
    const adminId = (req.user as any)?._id?.toString();
    const targetUserId = id === "me" ? adminId : (id as string);
    const meta = { ip: req.ip, userAgent: req.get("user-agent") };

    const result = await userServices.terminateUserSession(targetUserId, deviceId as string, adminId, meta);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: result.message,
        data: result,
    });
});

const terminateAllUserSessions = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const adminId = (req.user as any)?._id?.toString();
    const targetUserId = id === "me" ? adminId : (id as string);
    const meta = { ip: req.ip, userAgent: req.get("user-agent") };

    const result = await userServices.terminateAllUserSessions(targetUserId, adminId, meta);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: result.message,
        data: result,
    });
});

const exportUsersStream = catchAsync(async (req: Request, res: Response) => {
    await userServices.exportUsersStream(res, req.query);
});

export const userControllers = {
    getAllUsers,
    getUserStats,
    getUserById,
    updateUserStatus,
    changeUserPasswordByAdmin,
    updateUserByAdmin,
    deleteUserByAdmin,
    getUserSessions,
    terminateUserSession,
    terminateAllUserSessions,
    exportUsersStream,
};
