import mongoose from "mongoose";
import httpStatus from "http-status";
import ApiError from "../../../errors/ApiError";
import { jwtHelper } from "../../../utils/jwtHelper";
import config from "../../config";
import { UserModel } from "./auth.model";
import { ILiveLocation } from "./auth.interface";
import { resolveUserAddresses } from "./auth.utils";
import bcrypt from "bcrypt";
import crypto from "crypto";
import {
    sendOtpEmail,
    sendVerificationEmail,
    sendWelcomeEmail,
    sendEmailUpdateVerification,
} from "../../../utils/emailTemplates";
import { authRedis } from "./auth.redis";

const registerUser = async (data: any) => {
    // Check existing user
    const existing = await UserModel.findOne({ email: data.email.toLowerCase() });
    if (existing) throw new ApiError(httpStatus.BAD_REQUEST, "An account with this email address is already registered. Please sign in or reset your password.");

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, Number(config.bcrypt_salt_rounds));

    // Create user in MongoDB without temporary verification fields
    const userData = {
        ...data,
        email: data.email.toLowerCase(),
        password: hashedPassword,
        isActive: true,
        isEmailVerified: false,
    };

    // Verify referral code: user inputs the 8-character referral code (e.g. "VMOPEPTW")
    const refCode = data.referralCode || data.referredBy;
    let resolvedReferrerId: mongoose.Types.ObjectId | null = null;
    let isWrongReferral = false;
    let wrongReferralCode: string | null = null;

    if (refCode && typeof refCode === "string" && refCode.trim() !== "") {
        const normalizedCode = refCode.trim().toUpperCase();
        const referrer = await UserModel.findOne({
            referralCode: normalizedCode,
            isDeleted: false,
        });

        if (referrer) {
            resolvedReferrerId = referrer._id;
            isWrongReferral = false;
            console.log(`✅ [Referral Code Verified]: Valid code "${normalizedCode}" by ${referrer.name} (${referrer._id})`);
        } else {
            resolvedReferrerId = null;
            isWrongReferral = true;
            wrongReferralCode = normalizedCode;
            console.log(`⚠️ [Wrong Referral Code]: Code "${normalizedCode}" does not exist in system. Stored as isWrongReferral: true`);
        }
    }

    userData.referredBy = resolvedReferrerId;
    userData.isWrongReferral = isWrongReferral;
    userData.wrongReferralCode = wrongReferralCode;
    // Remove input referral code so pre-save hook generates this new user's own unique referral code
    delete userData.referralCode;

    // Resolve address locations using geocoding if coordinates not provided
    // If presentAddress and permanentAddress are the same, geocode only once!
    if (userData.presentAddress || userData.permanentAddress) {
        const resolved = await resolveUserAddresses(
            userData.presentAddress,
            userData.permanentAddress,
            data.sameAsPresent
        );
        if (resolved.presentAddress) {
            userData.presentAddress = resolved.presentAddress;
        } else {
            delete userData.presentAddress;
        }
        if (resolved.permanentAddress) {
            userData.permanentAddress = resolved.permanentAddress;
        } else {
            delete userData.permanentAddress;
        }
    }

    // Clean up liveLocation if invalid or missing coordinates
    if (userData.liveLocation) {
        if (
            !userData.liveLocation.coordinates ||
            !Array.isArray(userData.liveLocation.coordinates) ||
            userData.liveLocation.coordinates.length < 2
        ) {
            delete userData.liveLocation;
        } else {
            userData.liveLocation.type = "Point";
            userData.liveLocation.updatedAt = new Date();
        }
    }

    const createdUser = await UserModel.create(userData);

    // Generate secure verification token and 6-digit OTP code
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationCode = crypto.randomInt(100000, 999999).toString();

    // Store temporary verification data in Redis
    try {
        await authRedis.storeEmailVerification(
            createdUser.email as string,
            createdUser._id.toString(),
            verificationToken,
            verificationCode
        );

        const verificationUrl = `${config.client_url}/verify-email?token=${verificationToken}&email=${createdUser.email}`;
        await sendVerificationEmail(createdUser.email as string, createdUser.name as string, verificationUrl, verificationCode);
    } catch (redisOrMailError) {
        console.error("⚠️ [Register User] Error storing verification in Redis or sending verification email:", redisOrMailError);
    }

    // Generate tokens
    const jwtPayload = {
        _id: createdUser._id,
        name: createdUser.name,
        email: createdUser.email,
        role: createdUser.role,
    };

    const accessToken = jwtHelper.generateToken(jwtPayload, config.jwt_access_secret as string, config.jwt_access_expire as string);
    const refreshToken = jwtHelper.generateToken(jwtPayload, config.jwt_refresh_secret as string, config.jwt_refresh_expire as string);

    const userObject = createdUser.toObject();
    const { password: pwd, ...userWithoutSensitive } = userObject;

    return { user: userWithoutSensitive, accessToken, refreshToken };
};

const loginUser = async (data: { email: string; password: string; fcmToken?: string }) => {
    // Find user
    const user = await UserModel.findOne({ email: data.email.toLowerCase(), isDeleted: false });
    if (!user) throw new ApiError(httpStatus.UNAUTHORIZED, "Incorrect email or password. Please verify your credentials and try again.");

    // Check password
    const isPasswordValid = await bcrypt.compare(data.password, user.password as string);
    if (!isPasswordValid) throw new ApiError(httpStatus.UNAUTHORIZED, "Incorrect email or password. Please verify your credentials and try again.");

    // Check if active
    if (!user.isActive) {
        throw new ApiError(httpStatus.FORBIDDEN, "Your account has been deactivated. Please contact support for assistance.");
    }

    // Update last login and optionally add FCM device token if provided (capped at 5 recent devices)
    const updatePayload: any = { $set: { lastLogin: new Date() } };
    if (data.fcmToken) {
        const existingTokens: string[] = user.fcmTokens || [];
        const cappedTokens = [...existingTokens.filter((t: string) => t !== data.fcmToken), data.fcmToken].slice(-5);
        updatePayload.$set.fcmTokens = cappedTokens;
    }
    await UserModel.updateOne({ _id: user._id }, updatePayload);

    // Generate tokens
    const jwtPayload = {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
    };

    const accessToken = jwtHelper.generateToken(jwtPayload, config.jwt_access_secret as string, config.jwt_access_expire as string);
    const refreshToken = jwtHelper.generateToken(jwtPayload, config.jwt_refresh_secret as string, config.jwt_refresh_expire as string);

    const { password, ...userWithoutPassword } = user.toObject();

    return { user: userWithoutPassword, accessToken, refreshToken };
};

const verifyEmail = async (email: string, token?: string, otp?: string) => {
    // Verify token or OTP via Redis with attempt tracking
    const { userId } = await authRedis.verifyEmailInRedis(email, token, otp);

    const user = await UserModel.findOne({ _id: userId, isDeleted: false });
    if (!user) {
        throw new ApiError(httpStatus.NOT_FOUND, "Account verification failed. The user account could not be found.");
    }

    // Update user status in MongoDB
    user.isEmailVerified = true;
    await user.save();

    // Send Welcome Email upon successful verification
    sendWelcomeEmail(user.email, user.name);

    return { message: "Your email has been verified successfully. Welcome to FindBookStay!" };
};

const resendVerificationEmail = async (email: string) => {
    const user = await UserModel.findOne({ email: email.toLowerCase(), isDeleted: false });
    if (!user) {
        // Do not reveal whether user exists to prevent account enumeration
        return { message: "If an account with that email exists, a verification link has been sent." };
    }

    if (user.isEmailVerified) {
        throw new ApiError(httpStatus.BAD_REQUEST, "This email address is already verified.");
    }

    // Enforce 60-second cooldown
    const inCooldown = await authRedis.checkEmailVerifyCooldown(user.email);
    if (inCooldown) {
        throw new ApiError(httpStatus.TOO_MANY_REQUESTS, "Please wait 60 seconds before requesting another verification email.");
    }

    // Generate new secure verification token and code
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationCode = crypto.randomInt(100000, 999999).toString();

    // Store in Redis
    await authRedis.storeEmailVerification(user.email, user._id.toString(), verificationToken, verificationCode);

    // Send verification email
    const verificationUrl = `${config.client_url}/verify-email?token=${verificationToken}&email=${user.email}`;
    await sendVerificationEmail(user.email as string, user.name as string, verificationUrl, verificationCode);

    return { message: "A new verification email has been sent successfully." };
};

const getUserById = async (userId: string) => {
    const user = await UserModel.findOne({ _id: userId, isDeleted: false }).select("-password");
    if (!user) throw new ApiError(httpStatus.NOT_FOUND, "User account not found or no longer active.");
    return user;
};

const refreshAccessToken = async (refreshToken: string) => {
    if (!refreshToken) throw new ApiError(httpStatus.UNAUTHORIZED, "Authentication session expired. Please sign in again.");

    try {
        const decoded = jwtHelper.verifyToken(refreshToken, config.jwt_refresh_secret as string);

        const user = await UserModel.findOne({ _id: decoded._id, isDeleted: false }).select("-password");
        if (!user) throw new ApiError(httpStatus.UNAUTHORIZED, "Account not found. Please sign in again.");

        if (!user.isActive) {
            throw new ApiError(httpStatus.FORBIDDEN, "Your account has been deactivated. Please contact support.");
        }

        const jwtPayload = {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
        };

        const accessToken = jwtHelper.generateToken(jwtPayload, config.jwt_access_secret as string, config.jwt_access_expire as string);

        return { user, accessToken };
    } catch (error) {
        throw new ApiError(httpStatus.UNAUTHORIZED, "Your session has expired. Please sign in again to continue.");
    }
};

const requestPasswordReset = async (email: string) => {
    const normalizedEmail = email.toLowerCase().trim();

    // Check resend cooldown
    const inCooldown = await authRedis.checkPwdResetCooldown(normalizedEmail);
    if (inCooldown) {
        throw new ApiError(httpStatus.TOO_MANY_REQUESTS, "Please wait 60 seconds before requesting another password reset code.");
    }

    const user = await UserModel.findOne({ email: normalizedEmail, isDeleted: false });

    // If user exists, generate OTP and store in Redis
    if (user) {
        const otp = crypto.randomInt(100000, 999999).toString();
        await authRedis.storePwdResetOtp(normalizedEmail, user._id.toString(), otp);
        sendOtpEmail(user.email, otp, user.name as string);
    }

    // Always return success response to prevent email enumeration
    return { message: "If an account is associated with this email, a 6-digit password reset code has been sent." };
};

const verifyOtp = async (email: string, otp: string) => {
    const normalizedEmail = email.toLowerCase().trim();

    // Verify OTP using Redis (checks attempts, hash, and deletes OTP upon success)
    const { userId } = await authRedis.verifyPwdResetOtp(normalizedEmail, otp);

    // Generate cryptographically secure reset token (64 hex characters)
    const resetToken = crypto.randomBytes(32).toString("hex");

    // Store hashed reset token in Redis with 10-minute TTL
    await authRedis.storePwdResetToken(userId, normalizedEmail, resetToken);

    return { token: resetToken };
};

const resendOtp = async (email: string) => {
    const normalizedEmail = email.toLowerCase().trim();

    const inCooldown = await authRedis.checkPwdResetCooldown(normalizedEmail);
    if (inCooldown) {
        throw new ApiError(httpStatus.TOO_MANY_REQUESTS, "Please wait 60 seconds before requesting another password reset code.");
    }

    const user = await UserModel.findOne({ email: normalizedEmail, isDeleted: false });
    if (user) {
        const otp = crypto.randomInt(100000, 999999).toString();
        await authRedis.storePwdResetOtp(normalizedEmail, user._id.toString(), otp);
        sendOtpEmail(user.email, otp, user.name as string);
    }

    return { message: "A new 6-digit password reset code has been sent to your email." };
};

const resetPassword = async (token: string, newPassword: string) => {
    if (!token) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Password reset token is missing or invalid. Please request a new password reset.");
    }

    // Atomically validate and consume the reset token from Redis (prevents token reuse)
    const { userId } = await authRedis.consumePwdResetToken(token);

    const user = await UserModel.findOne({ _id: userId, isDeleted: false });
    if (!user) {
        throw new ApiError(httpStatus.NOT_FOUND, "The account associated with this password reset could not be found.");
    }

    // Hash new password and update in MongoDB
    const hashedPassword = await bcrypt.hash(newPassword, Number(config.bcrypt_salt_rounds));
    user.password = hashedPassword;
    await user.save();

    return { message: "Your password has been reset successfully. You can now log in with your new password." };
};

const updateProfile = async (userId: string, data: any) => {
    if (data.presentAddress || data.permanentAddress || data.sameAsPresent) {
        let currentPresent = data.presentAddress;
        let currentPermanent = data.permanentAddress;

        // If sameAsPresent is true and permanentAddress is not provided, copy presentAddress
        if (data.sameAsPresent && currentPresent && !currentPermanent) {
            currentPermanent = { ...currentPresent };
        }

        const resolved = await resolveUserAddresses(
            currentPresent,
            currentPermanent,
            data.sameAsPresent
        );

        if (resolved.presentAddress !== undefined) {
            data.presentAddress = resolved.presentAddress;
        }
        if (resolved.permanentAddress !== undefined) {
            data.permanentAddress = resolved.permanentAddress;
        }
    }

    delete data.sameAsPresent;

    // Handle liveLocation if provided in profile update
    if (data.liveLocation) {
        if (Array.isArray(data.liveLocation.coordinates) && data.liveLocation.coordinates.length === 2) {
            data.liveLocation.type = "Point";
            data.liveLocation.updatedAt = new Date();
        } else if (data.liveLocation.latitude !== undefined && data.liveLocation.longitude !== undefined) {
            data.liveLocation = {
                type: "Point",
                coordinates: [Number(data.liveLocation.longitude), Number(data.liveLocation.latitude)],
                updatedAt: new Date(),
                ...(data.liveLocation.heading !== undefined && { heading: Number(data.liveLocation.heading) }),
                ...(data.liveLocation.speed !== undefined && { speed: Number(data.liveLocation.speed) }),
            };
        } else {
            delete data.liveLocation;
        }
    }

    const user = await UserModel.findOneAndUpdate(
        { _id: userId, isDeleted: false },
        { $set: data },
        { returnDocument: "after", runValidators: true }
    ).select("-password");

    if (!user) throw new ApiError(httpStatus.NOT_FOUND, "User account not found or no longer active.");

    return user;
};

/**
 * Update user's live device location coordinates.
 * Device coordinates come directly from client GPS/browser navigator.
 * NO Google Maps or external geocoding API is invoked here.
 */
const updateLiveLocation = async (
    userId: string,
    payload: {
        latitude?: number;
        longitude?: number;
        lat?: number;
        lng?: number;
        coordinates?: [number, number]; // [longitude, latitude]
        heading?: number;
        speed?: number;
    }
) => {
    let lat: number | undefined;
    let lng: number | undefined;

    if (Array.isArray(payload.coordinates) && payload.coordinates.length === 2) {
        lng = Number(payload.coordinates[0]);
        lat = Number(payload.coordinates[1]);
    } else {
        if (payload.latitude !== undefined) lat = Number(payload.latitude);
        else if (payload.lat !== undefined) lat = Number(payload.lat);

        if (payload.longitude !== undefined) lng = Number(payload.longitude);
        else if (payload.lng !== undefined) lng = Number(payload.lng);
    }

    if (lat === undefined || lng === undefined || isNaN(lat) || isNaN(lng)) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Valid latitude and longitude coordinates are required.");
    }

    if (lat < -90 || lat > 90) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Latitude must be between -90 and 90.");
    }
    if (lng < -180 || lng > 180) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Longitude must be between -180 and 180.");
    }

    const liveLocation: ILiveLocation = {
        type: "Point",
        coordinates: [lng, lat],
        updatedAt: new Date(),
        ...(payload.heading !== undefined && !isNaN(Number(payload.heading)) && { heading: Number(payload.heading) }),
        ...(payload.speed !== undefined && !isNaN(Number(payload.speed)) && { speed: Number(payload.speed) }),
    };

    const user = await UserModel.findOneAndUpdate(
        { _id: userId, isDeleted: false },
        { $set: { liveLocation } },
        { returnDocument: "after", runValidators: true }
    ).select("-password");

    if (!user) {
        throw new ApiError(httpStatus.NOT_FOUND, "User account not found or no longer active.");
    }

    return {
        liveLocation: user.liveLocation,
        user,
    };
};

const getLiveLocation = async (userId: string) => {
    const user = await UserModel.findOne({ _id: userId, isDeleted: false }).select("liveLocation name email");
    if (!user) {
        throw new ApiError(httpStatus.NOT_FOUND, "User account not found or no longer active.");
    }
    return user.liveLocation || null;
};

const changePassword = async (userId: string, currentPassword: string, newPassword: string) => {
    const user = await UserModel.findOne({ _id: userId, isDeleted: false });
    if (!user) throw new ApiError(httpStatus.NOT_FOUND, "User account not found.");

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password as string);
    if (!isPasswordValid) throw new ApiError(httpStatus.BAD_REQUEST, "The current password you entered is incorrect. Please try again.");

    const hashedPassword = await bcrypt.hash(newPassword, Number(config.bcrypt_salt_rounds));
    user.password = hashedPassword;
    await user.save();

    return { message: "Your password has been changed successfully." };
};

const updateEmail = async (userId: string, newEmail: string, password: string) => {
    const normalizedNewEmail = newEmail.toLowerCase().trim();

    const user = await UserModel.findOne({ _id: userId, isDeleted: false });
    if (!user) throw new ApiError(httpStatus.NOT_FOUND, "User account not found.");

    const isPasswordValid = await bcrypt.compare(password, user.password as string);
    if (!isPasswordValid) throw new ApiError(httpStatus.BAD_REQUEST, "Incorrect password. Please enter your current password to confirm this email change.");

    // Check if new email already belongs to a registered account
    const existingUser = await UserModel.findOne({ email: normalizedNewEmail, isDeleted: false });
    if (existingUser) throw new ApiError(httpStatus.BAD_REQUEST, "This email address is already registered to another account.");

    // Check if new email is currently pending verification by another user in Redis
    const isClaimed = await authRedis.checkPendingEmailClaim(normalizedNewEmail, userId);
    if (isClaimed) {
        throw new ApiError(httpStatus.CONFLICT, "This email address is currently undergoing verification by another user.");
    }

    // Check resend cooldown
    const inCooldown = await authRedis.checkEmailUpdateCooldown(userId);
    if (inCooldown) {
        throw new ApiError(httpStatus.TOO_MANY_REQUESTS, "Please wait 60 seconds before requesting another email update.");
    }

    // Generate secure verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");

    // Store in Redis with TTL
    await authRedis.storeEmailUpdate(userId, normalizedNewEmail, verificationToken);

    // Send verification email to the new address
    const verificationUrl = `${config.client_url}/verify-new-email?token=${verificationToken}&email=${normalizedNewEmail}`;
    sendEmailUpdateVerification(normalizedNewEmail, user.name as string, verificationUrl);

    return { message: "An email update verification link has been sent to your new address. Please check your inbox." };
};

const resendEmailUpdate = async (userId: string, password: string) => {
    const user = await UserModel.findOne({ _id: userId, isDeleted: false });
    if (!user) throw new ApiError(httpStatus.NOT_FOUND, "User account not found.");

    const isPasswordValid = await bcrypt.compare(password, user.password as string);
    if (!isPasswordValid) throw new ApiError(httpStatus.BAD_REQUEST, "Incorrect password. Please enter your password to resend the verification email.");

    // Check existing pending email update in Redis
    const pendingData = await authRedis.getPendingEmailUpdate(userId);
    if (!pendingData) {
        throw new ApiError(httpStatus.BAD_REQUEST, "No pending email update request found for this account.");
    }

    // Check cooldown
    const inCooldown = await authRedis.checkEmailUpdateCooldown(userId);
    if (inCooldown) {
        throw new ApiError(httpStatus.TOO_MANY_REQUESTS, "Please wait 60 seconds before resending verification.");
    }

    // Generate new verification token and refresh Redis entry
    const verificationToken = crypto.randomBytes(32).toString("hex");
    await authRedis.storeEmailUpdate(userId, pendingData.pendingEmail, verificationToken);

    // Send verification email
    const verificationUrl = `${config.client_url}/verify-new-email?token=${verificationToken}&email=${pendingData.pendingEmail}`;
    sendEmailUpdateVerification(pendingData.pendingEmail, user.name as string, verificationUrl);

    return { message: "A new verification email has been sent to your new email address." };
};

const verifyNewEmail = async (token: string, email?: string) => {
    if (!token) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Verification link token is required.");
    }

    // Atomically validate and consume token from Redis
    const { userId, pendingEmail } = await authRedis.consumeNewEmailToken(token, email);

    // Concurrency safety: double-check that email wasn't claimed between request and verification
    const emailConflict = await UserModel.findOne({
        email: pendingEmail,
        _id: { $ne: userId },
        isDeleted: false,
    });

    if (emailConflict) {
        throw new ApiError(httpStatus.CONFLICT, "This email address is already registered to another account.");
    }

    // Update user's email in MongoDB
    const updatedUser = await UserModel.findByIdAndUpdate(
        userId,
        { $set: { email: pendingEmail } },
        { new: true }
    );

    if (!updatedUser) {
        throw new ApiError(httpStatus.NOT_FOUND, "User account not found.");
    }

    return { message: "Your new email address has been verified and updated successfully." };
};

const deleteUser = async (userId: string) => {
    const user = await UserModel.findByIdAndUpdate(userId, { $set: { isDeleted: true } }, { returnDocument: "after" });
    if (!user) throw new ApiError(httpStatus.NOT_FOUND, "User account not found or has already been deleted.");

    return user;
};

const validateReferralCode = async (code: string) => {
    if (!code) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Please enter a referral code to validate.");
    }
    const user = await UserModel.findOne({
        referralCode: code.toUpperCase().trim(),
        isDeleted: false,
    }).select("name referralCode");

    if (!user) {
        throw new ApiError(httpStatus.NOT_FOUND, "This referral code is invalid or does not exist. Please check and try again.");
    }

    return {
        valid: true,
        referralCode: user.referralCode,
        referrerId: user._id,
        referrerName: user.name,
    };
};

const MAX_DEVICE_TOKENS = 5;

const addFcmToken = async (userId: string, fcmToken: string) => {
    if (!fcmToken) {
        throw new ApiError(httpStatus.BAD_REQUEST, "FCM device token is required.");
    }

    const user = await UserModel.findById(userId).select("fcmTokens");
    if (!user) {
        throw new ApiError(httpStatus.NOT_FOUND, "User account not found.");
    }

    const existingTokens: string[] = user.fcmTokens || [];
    // Remove if duplicate, append new token, keep only the most recent MAX_DEVICE_TOKENS
    const cappedTokens = [...existingTokens.filter((t) => t !== fcmToken), fcmToken].slice(-MAX_DEVICE_TOKENS);

    await UserModel.updateOne({ _id: userId }, { $set: { fcmTokens: cappedTokens } });

    return { message: "FCM token registered successfully." };
};

const removeFcmToken = async (userId: string, fcmToken: string) => {
    if (!fcmToken) {
        throw new ApiError(httpStatus.BAD_REQUEST, "FCM device token is required.");
    }

    await UserModel.updateOne(
        { _id: userId },
        { $pull: { fcmTokens: fcmToken } }
    );

    return { message: "FCM token removed successfully." };
};

export const authServices = {
    registerUser,
    loginUser,
    verifyEmail,
    resendVerificationEmail,
    getUserById,
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
    deleteUser,
    validateReferralCode,
    addFcmToken,
    removeFcmToken,
    updateLiveLocation,
    getLiveLocation,
    resolveUserAddresses,
};
