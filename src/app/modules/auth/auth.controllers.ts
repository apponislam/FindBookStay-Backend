import httpStatus from "http-status";
import ApiError from "../../../errors/ApiError";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";
import config from "../../config";
import { Request, Response } from "express";
import { authServices } from "./auth.services";
import { activityLogServices } from "../activityLog/activityLog.services";

const register = catchAsync(async (req: Request, res: Response) => {
    console.log("📥 [Register Request Body]:", JSON.stringify(req.body, null, 2));

    const data = req.body;

    // Capture referral input from either referredBy or referralCode
    const referralInput = data.referredBy || data.referralCode;

    // Parse JSON fields
    const userData: any = {
        name: data.name,
        email: data.email,
        password: data.password,
        role: data.role,
        phone: data.phone,
        profileImage: data.profileImage,
        presentAddress: data.presentAddress,
        permanentAddress: data.permanentAddress,
        referredBy: referralInput,
    };

    // Clean up empty optional fields so MongoDB / Mongoose casting doesn't fail
    if (!userData.referredBy) delete userData.referredBy;
    if (!userData.presentAddress) delete userData.presentAddress;
    if (!userData.permanentAddress) delete userData.permanentAddress;
    if (!userData.phone) delete userData.phone;
    if (!userData.profileImage) delete userData.profileImage;

    // Basic validation
    if (!userData.name || !userData.email || !userData.password) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Name, email, and password are required");
    }


    const result = await authServices.registerUser(userData);

    res.cookie("refreshToken", result.refreshToken, {
        httpOnly: true,
        secure: config.node_env === "production",
        sameSite: "strict",
        maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    activityLogServices.createActivityLog({
        user: result.user._id,
        role: result.user.role,
        action: "AUTH_REGISTER",
        module: "AUTH",
        description: `New user registered account: ${result.user.name} (${result.user.email})`,
        status: "SUCCESS",
        ipAddress: req.ip || (req.headers["x-forwarded-for"] as string),
        userAgent: req.headers["user-agent"],
    });

    sendResponse(res, {
        statusCode: httpStatus.CREATED,
        success: true,
        message: "Account registered successfully. Please check your email to verify your account.",
        data: {
            user: result.user,
            accessToken: result.accessToken,
        },
    });
});

const login = catchAsync(async (req: Request, res: Response) => {
    const result = await authServices.loginUser(req.body);

    res.cookie("refreshToken", result.refreshToken, {
        httpOnly: true,
        secure: config.node_env === "production",
        sameSite: "strict",
        maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    activityLogServices.createActivityLog({
        user: result.user._id,
        role: result.user.role,
        action: "AUTH_LOGIN",
        module: "AUTH",
        description: `User signed in successfully: ${result.user.name} (${result.user.email})`,
        status: "SUCCESS",
        ipAddress: req.ip || (req.headers["x-forwarded-for"] as string),
        userAgent: req.headers["user-agent"],
    });

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Signed in successfully.",
        data: {
            user: result.user,
            accessToken: result.accessToken,
        },
    });
});

const verifyEmail = catchAsync(async (req: Request, res: Response) => {
    const token = (req.query.token as string | undefined) || req.body?.token;
    const otp = (req.query.otp as string | undefined) || req.body?.otp;
    const email = (req.query.email as string) || req.body?.email;

    if (!email) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Email is required");
    }

    await authServices.verifyEmail(email, token, otp);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Email verified successfully",
        data: null,
    });
});

const resendVerificationEmail = catchAsync(async (req: Request, res: Response) => {
    const { email } = req.body;
    await authServices.resendVerificationEmail(email);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Verification email resent successfully",
        data: null,
    });
});

const getMe = catchAsync(async (req: Request, res: Response) => {
    const user = await authServices.getUserById(req.user._id);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "User retrieved successfully",
        data: user,
    });
});

const logout = catchAsync(async (req: Request, res: Response) => {
    res.clearCookie("refreshToken");

    if (req.user && req.body?.fcmToken) {
        await authServices.removeFcmToken(req.user._id, req.body.fcmToken);
    }

    if (req.user) {
        activityLogServices.createActivityLog({
            user: req.user._id,
            role: req.user.role,
            action: "AUTH_LOGOUT",
            module: "AUTH",
            description: "User signed out successfully",
            status: "SUCCESS",
            ipAddress: req.ip || (req.headers["x-forwarded-for"] as string),
            userAgent: req.headers["user-agent"],
        });
    }

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Signed out successfully.",
        data: null,
    });
});

const refreshAccessToken = catchAsync(async (req: Request, res: Response) => {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
    const result = await authServices.refreshAccessToken(refreshToken);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Token refreshed successfully",
        data: result,
    });
});

const requestPasswordReset = catchAsync(async (req: Request, res: Response) => {
    await authServices.requestPasswordReset(req.body.email);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Password reset OTP sent to email",
        data: null,
    });
});

const verifyOtp = catchAsync(async (req: Request, res: Response) => {
    const result = await authServices.verifyOtp(req.body.email, req.body.otp);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "OTP verified successfully",
        data: { token: result.token },
    });
});

const resendOtp = catchAsync(async (req: Request, res: Response) => {
    await authServices.resendOtp(req.body.email);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "OTP resent successfully",
        data: null,
    });
});

const resetPassword = catchAsync(async (req: Request, res: Response) => {
    const token = (req.query.token as string) || req.body.token;
    await authServices.resetPassword(token, req.body.newPassword);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Password reset successful",
        data: null,
    });
});

const updateProfile = catchAsync(async (req: Request, res: Response) => {
    const data = req.body;

    // Construct update data based on the provided fields
    const updateData: any = {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.profileImage !== undefined && { profileImage: data.profileImage }),
        ...(data.language !== undefined && { language: data.language }),
        ...(data.presentAddress !== undefined && { presentAddress: data.presentAddress }),
        ...(data.permanentAddress !== undefined && { permanentAddress: data.permanentAddress }),
        ...(data.fcmTokens !== undefined && { fcmTokens: data.fcmTokens }),
        ...(data.hasHome !== undefined && { hasHome: data.hasHome }),
        ...(data.hasStay !== undefined && { hasStay: data.hasStay }),
        ...(data.hasTurf !== undefined && { hasTurf: data.hasTurf }),
        ...(data.hasProperty !== undefined && { hasProperty: data.hasProperty }),
    };

    const updatedUser = await authServices.updateProfile(req.user._id, updateData);

    activityLogServices.createActivityLog({
        user: req.user._id,
        role: req.user.role,
        action: "PROFILE_UPDATE",
        module: "USER",
        description: `User profile updated (${Object.keys(updateData).join(", ")})`,
        status: "SUCCESS",
        ipAddress: req.ip || (req.headers["x-forwarded-for"] as string),
        userAgent: req.headers["user-agent"],
        metadata: { updatedFields: Object.keys(updateData) },
    });

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Profile updated successfully.",
        data: updatedUser,
    });
});

const changePassword = catchAsync(async (req: Request, res: Response) => {
    await authServices.changePassword(req.user._id, req.body.currentPassword, req.body.newPassword);

    activityLogServices.createActivityLog({
        user: req.user._id,
        role: req.user.role,
        action: "PASSWORD_CHANGE",
        module: "AUTH",
        description: "User account password changed successfully",
        status: "SUCCESS",
        ipAddress: req.ip || (req.headers["x-forwarded-for"] as string),
        userAgent: req.headers["user-agent"],
    });

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Password changed successfully.",
        data: null,
    });
});

const updateEmail = catchAsync(async (req: Request, res: Response) => {
    await authServices.updateEmail(req.user._id, req.body.email, req.body.password);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Email update requested. Please verify new email.",
        data: null,
    });
});

const resendEmailUpdate = catchAsync(async (req: Request, res: Response) => {
    await authServices.resendEmailUpdate(req.user._id, req.body.password);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Email verification resent successfully",
        data: null,
    });
});

const verifyNewEmail = catchAsync(async (req: Request, res: Response) => {
    const { token, email } = req.query;
    await authServices.verifyNewEmail(token as string, email as string);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "New email verified successfully",
        data: null,
    });
});

const deleteAccount = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user._id;
    await authServices.deleteUser(userId.toString());
    res.clearCookie("refreshToken");

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Account deleted successfully",
        data: null,
    });
});

const validateReferralCode = catchAsync(async (req: Request, res: Response) => {
    const code = req.params.code as string;
    const result = await authServices.validateReferralCode(code);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Referral code verified successfully.",
        data: result,
    });
});

const addFcmToken = catchAsync(async (req: Request, res: Response) => {
    const { fcmToken } = req.body;
    const result = await authServices.addFcmToken(req.user._id, fcmToken);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: result.message,
        data: null,
    });
});

const removeFcmToken = catchAsync(async (req: Request, res: Response) => {
    const { fcmToken } = req.body;
    const result = await authServices.removeFcmToken(req.user._id, fcmToken);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: result.message,
        data: null,
    });
});

export const authControllers = {
    register,
    login,
    verifyEmail,
    resendVerificationEmail,
    getMe,
    logout,
    refreshAccessToken,
    requestPasswordReset,
    verifyOtp,
    resendOtp,
    resetPassword,
    updateProfile,
    changePassword,
    updateEmail,
    resendEmailUpdate,
    verifyNewEmail,
    deleteAccount,
    validateReferralCode,
    addFcmToken,
    removeFcmToken,
};
