import httpStatus from "http-status";
import ApiError from "../../../errors/ApiError";
import { jwtHelper } from "../../../utils/jwtHelper";
import config from "../../config";
import { UserModel } from "./auth.model";
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
    if (existing) throw new ApiError(httpStatus.BAD_REQUEST, "Email already registered. Please sign in.");

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

    const createdUser = await UserModel.create(userData);

    // Generate secure verification token and 6-digit OTP code
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationCode = crypto.randomInt(100000, 999999).toString();

    // Store temporary verification data in Redis
    await authRedis.storeEmailVerification(
        createdUser.email as string,
        createdUser._id.toString(),
        verificationToken,
        verificationCode
    );

    const verificationUrl = `${config.client_url}/verify-email?token=${verificationToken}&email=${createdUser.email}`;
    sendVerificationEmail(createdUser.email as string, createdUser.name as string, verificationUrl, verificationCode);
    sendWelcomeEmail(createdUser.email as string, createdUser.name as string);

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

const loginUser = async (data: { email: string; password: string }) => {
    // Find user
    const user = await UserModel.findOne({ email: data.email.toLowerCase(), isDeleted: false });
    if (!user) throw new ApiError(httpStatus.UNAUTHORIZED, "Incorrect email or password");

    // Check password
    const isPasswordValid = await bcrypt.compare(data.password, user.password as string);
    if (!isPasswordValid) throw new ApiError(httpStatus.UNAUTHORIZED, "Incorrect email or password");

    // Check if active
    if (!user.isActive) {
        throw new ApiError(httpStatus.FORBIDDEN, "Your account has been deactivated. Please contact support for assistance.");
    }

    // Update last login
    await UserModel.updateOne({ _id: user._id }, { $set: { lastLogin: new Date() } });

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
        throw new ApiError(httpStatus.NOT_FOUND, "User not found");
    }

    // Update user status in MongoDB
    user.isEmailVerified = true;
    await user.save();

    return { message: "Email verified successfully" };
};

const resendVerificationEmail = async (email: string) => {
    const user = await UserModel.findOne({ email: email.toLowerCase(), isDeleted: false });
    if (!user) {
        // Do not reveal whether user exists to prevent account enumeration
        return { message: "Verification email sent" };
    }

    if (user.isEmailVerified) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Email already verified");
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
    sendVerificationEmail(user.email as string, user.name as string, verificationUrl, verificationCode);

    return { message: "Verification email sent" };
};

const getUserById = async (userId: string) => {
    const user = await UserModel.findOne({ _id: userId, isDeleted: false }).select("-password");
    if (!user) throw new ApiError(httpStatus.NOT_FOUND, "User not registered");
    return user;
};

const refreshAccessToken = async (refreshToken: string) => {
    if (!refreshToken) throw new ApiError(httpStatus.UNAUTHORIZED, "Refresh token required");

    try {
        const decoded = jwtHelper.verifyToken(refreshToken, config.jwt_refresh_secret as string);

        const user = await UserModel.findOne({ _id: decoded._id, isDeleted: false }).select("-password");
        if (!user) throw new ApiError(httpStatus.UNAUTHORIZED, "User not registered");

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
        throw new ApiError(httpStatus.UNAUTHORIZED, "Invalid refresh token");
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
    return { message: "If an account with that email exists, an OTP has been sent." };
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
        throw new ApiError(httpStatus.TOO_MANY_REQUESTS, "Please wait 60 seconds before requesting another OTP.");
    }

    const user = await UserModel.findOne({ email: normalizedEmail, isDeleted: false });
    if (user) {
        const otp = crypto.randomInt(100000, 999999).toString();
        await authRedis.storePwdResetOtp(normalizedEmail, user._id.toString(), otp);
        sendOtpEmail(user.email, otp, user.name as string);
    }

    return { message: "OTP resent" };
};

const resetPassword = async (token: string, newPassword: string) => {
    if (!token) {
        throw new ApiError(httpStatus.BAD_REQUEST, "The password reset token is required.");
    }

    // Atomically validate and consume the reset token from Redis (prevents token reuse)
    const { userId } = await authRedis.consumePwdResetToken(token);

    const user = await UserModel.findOne({ _id: userId, isDeleted: false });
    if (!user) {
        throw new ApiError(httpStatus.NOT_FOUND, "User account not found.");
    }

    // Hash new password and update in MongoDB
    const hashedPassword = await bcrypt.hash(newPassword, Number(config.bcrypt_salt_rounds));
    user.password = hashedPassword;
    await user.save();

    return { message: "Password reset successful" };
};

const updateProfile = async (userId: string, data: any) => {
    const user = await UserModel.findOneAndUpdate(
        { _id: userId, isDeleted: false },
        { $set: data },
        { returnDocument: "after", runValidators: true }
    ).select("-password");

    if (!user) throw new ApiError(httpStatus.NOT_FOUND, "User not registered");

    return user;
};

const changePassword = async (userId: string, currentPassword: string, newPassword: string) => {
    const user = await UserModel.findOne({ _id: userId, isDeleted: false });
    if (!user) throw new ApiError(httpStatus.NOT_FOUND, "User not registered");

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password as string);
    if (!isPasswordValid) throw new ApiError(httpStatus.BAD_REQUEST, "Incorrect current password");

    const hashedPassword = await bcrypt.hash(newPassword, Number(config.bcrypt_salt_rounds));
    user.password = hashedPassword;
    await user.save();

    return { message: "Password changed successfully" };
};

const updateEmail = async (userId: string, newEmail: string, password: string) => {
    const normalizedNewEmail = newEmail.toLowerCase().trim();

    const user = await UserModel.findOne({ _id: userId, isDeleted: false });
    if (!user) throw new ApiError(httpStatus.NOT_FOUND, "User not registered");

    const isPasswordValid = await bcrypt.compare(password, user.password as string);
    if (!isPasswordValid) throw new ApiError(httpStatus.BAD_REQUEST, "Incorrect password");

    // Check if new email already belongs to a registered account
    const existingUser = await UserModel.findOne({ email: normalizedNewEmail, isDeleted: false });
    if (existingUser) throw new ApiError(httpStatus.BAD_REQUEST, "Email is already registered");

    // Check if new email is currently pending verification by another user in Redis
    const isClaimed = await authRedis.checkPendingEmailClaim(normalizedNewEmail, userId);
    if (isClaimed) {
        throw new ApiError(httpStatus.CONFLICT, "This email is currently undergoing verification by another user.");
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

    return { message: "Email update requested. Please verify new email." };
};

const resendEmailUpdate = async (userId: string, password: string) => {
    const user = await UserModel.findOne({ _id: userId, isDeleted: false });
    if (!user) throw new ApiError(httpStatus.NOT_FOUND, "User not registered");

    const isPasswordValid = await bcrypt.compare(password, user.password as string);
    if (!isPasswordValid) throw new ApiError(httpStatus.BAD_REQUEST, "Password is incorrect");

    // Check existing pending email update in Redis
    const pendingData = await authRedis.getPendingEmailUpdate(userId);
    if (!pendingData) {
        throw new ApiError(httpStatus.BAD_REQUEST, "No pending email update request found.");
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

    return { message: "Verification email resent" };
};

const verifyNewEmail = async (token: string, email?: string) => {
    if (!token) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Verification token is required.");
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
        throw new ApiError(httpStatus.CONFLICT, "This email is already registered to another account.");
    }

    // Update user's email in MongoDB
    const updatedUser = await UserModel.findByIdAndUpdate(
        userId,
        { $set: { email: pendingEmail } },
        { new: true }
    );

    if (!updatedUser) {
        throw new ApiError(httpStatus.NOT_FOUND, "User not found.");
    }

    return { message: "New email verified successfully" };
};

const deleteUser = async (userId: string) => {
    const user = await UserModel.findByIdAndUpdate(userId, { $set: { isDeleted: true } }, { returnDocument: "after" });
    if (!user) throw new ApiError(httpStatus.NOT_FOUND, "User not found");

    return user;
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
};
