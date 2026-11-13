import crypto from "crypto";
import httpStatus from "http-status";
import ApiError from "../../../errors/ApiError";
import { redis, getCache, setCache, deleteCache } from "../../../utils/redis";

// TTL Constants in seconds
const REDIS_TTL = {
    PWD_RESET_OTP: 5 * 60, // 5 minutes
    PWD_RESET_TOKEN: 10 * 60, // 10 minutes
    EMAIL_VERIFY: 24 * 60 * 60, // 24 hours
    EMAIL_UPDATE: 24 * 60 * 60, // 24 hours
    COOLDOWN: 60, // 60 seconds resend cooldown
    MAX_ATTEMPTS: 5,
};

// Key prefix patterns
const KEYS = {
    pwdResetOtp: (email: string) => `auth:pwd_reset:otp:${email.toLowerCase()}`,
    pwdResetCooldown: (email: string) => `auth:pwd_reset:cooldown:${email.toLowerCase()}`,
    pwdResetToken: (hashedToken: string) => `auth:pwd_reset:token:${hashedToken}`,

    emailVerifyData: (email: string) => `auth:email_verify:data:${email.toLowerCase()}`,
    emailVerifyToken: (hashedToken: string) => `auth:email_verify:token:${hashedToken}`,
    emailVerifyCooldown: (email: string) => `auth:email_verify:cooldown:${email.toLowerCase()}`,

    emailUpdateData: (userId: string) => `auth:email_update:${userId}`,
    emailUpdateToken: (hashedToken: string) => `auth:email_update:token:${hashedToken}`,
    emailUpdateClaim: (email: string) => `auth:email_update:pending:${email.toLowerCase()}`,
    emailUpdateCooldown: (userId: string) => `auth:email_update:cooldown:${userId}`,
};

/**
 * High-entropy cryptographic hashing with SHA-256
 */
const hashSecret = (value: string): string => {
    return crypto.createHash("sha256").update(value.trim()).digest("hex");
};

/**
 * Constant-time hash comparison to prevent timing attacks
 */
const compareSecret = (plainInput: string, hashedTarget: string): boolean => {
    try {
        const inputHash = hashSecret(plainInput);
        const a = Buffer.from(inputHash, "hex");
        const b = Buffer.from(hashedTarget, "hex");
        if (a.length !== b.length) return false;
        return crypto.timingSafeEqual(a, b);
    } catch {
        return false;
    }
};

/* ==========================================================================
   A. Password Reset Flow
   ========================================================================== */

interface PwdResetOtpData {
    userId: string;
    hashedOtp: string;
    attempts: number;
}

interface PwdResetTokenData {
    userId: string;
    email: string;
}

/**
 * Check if user is in resend cooldown for password reset
 */
const checkPwdResetCooldown = async (email: string): Promise<boolean> => {
    const cooldown = await redis.get(KEYS.pwdResetCooldown(email));
    return Boolean(cooldown);
};

/**
 * Store hashed password reset OTP in Redis with 5-min TTL & set 60s cooldown
 */
const storePwdResetOtp = async (email: string, userId: string, rawOtp: string): Promise<void> => {
    const hashedOtp = hashSecret(rawOtp);
    const data: PwdResetOtpData = {
        userId,
        hashedOtp,
        attempts: 0,
    };

    const pipeline = redis.pipeline();
    pipeline.set(KEYS.pwdResetOtp(email), JSON.stringify(data), "EX", REDIS_TTL.PWD_RESET_OTP);
    pipeline.set(KEYS.pwdResetCooldown(email), "1", "EX", REDIS_TTL.COOLDOWN);
    await pipeline.exec();
};

/**
 * Verify OTP, track attempts (max 5), invalidate on success or failure, and return userId
 */
const verifyPwdResetOtp = async (email: string, rawOtp: string): Promise<{ userId: string }> => {
    const key = KEYS.pwdResetOtp(email);
    const data = await getCache<PwdResetOtpData>(key);

    if (!data) {
        throw new ApiError(httpStatus.BAD_REQUEST, "OTP is invalid or has expired. Please request a new one.");
    }

    if (data.attempts >= REDIS_TTL.MAX_ATTEMPTS) {
        await deleteCache(key);
        throw new ApiError(httpStatus.TOO_MANY_REQUESTS, "Maximum OTP verification attempts exceeded. Please request a new OTP.");
    }

    const isValid = compareSecret(rawOtp, data.hashedOtp);

    if (!isValid) {
        data.attempts += 1;
        if (data.attempts >= REDIS_TTL.MAX_ATTEMPTS) {
            await deleteCache(key);
            throw new ApiError(httpStatus.TOO_MANY_REQUESTS, "Maximum OTP verification attempts exceeded. Please request a new OTP.");
        }

        // Update attempt count while preserving remaining TTL
        const remainingTtl = await redis.ttl(key);
        if (remainingTtl > 0) {
            await setCache(key, data, remainingTtl);
        }

        const remainingAttempts = REDIS_TTL.MAX_ATTEMPTS - data.attempts;
        throw new ApiError(httpStatus.BAD_REQUEST, `Invalid OTP code. ${remainingAttempts} attempt(s) remaining.`);
    }

    // Invalidate OTP immediately upon successful verification
    await deleteCache(key);

    return { userId: data.userId };
};

/**
 * Store hashed reset token in Redis with 10-minute TTL
 */
const storePwdResetToken = async (userId: string, email: string, rawToken: string): Promise<void> => {
    const hashedToken = hashSecret(rawToken);
    const data: PwdResetTokenData = { userId, email };
    await setCache(KEYS.pwdResetToken(hashedToken), data, REDIS_TTL.PWD_RESET_TOKEN);
};

/**
 * Validate and atomically consume the password reset token (prevent reuse)
 */
const consumePwdResetToken = async (rawToken: string): Promise<PwdResetTokenData> => {
    const hashedToken = hashSecret(rawToken);
    const key = KEYS.pwdResetToken(hashedToken);
    const data = await getCache<PwdResetTokenData>(key);

    if (!data) {
        throw new ApiError(httpStatus.BAD_REQUEST, "The password reset token is invalid or has expired. Please try again.");
    }

    // Atomically consume / delete token to strictly prevent token reuse
    await deleteCache(key);

    return data;
};

/* ==========================================================================
   B. Email Verification (Registration) Flow
   ========================================================================== */

interface EmailVerifyData {
    userId: string;
    hashedToken: string;
    hashedCode: string;
    attempts: number;
}

interface EmailVerifyTokenIndex {
    email: string;
    userId: string;
}

/**
 * Check if user is in resend cooldown for registration email verification
 */
const checkEmailVerifyCooldown = async (email: string): Promise<boolean> => {
    const cooldown = await redis.get(KEYS.emailVerifyCooldown(email));
    return Boolean(cooldown);
};

/**
 * Store registration verification token and code in Redis with 24-hr TTL
 */
const storeEmailVerification = async (
    email: string,
    userId: string,
    rawToken: string,
    rawCode: string
): Promise<void> => {
    const hashedToken = hashSecret(rawToken);
    const hashedCode = hashSecret(rawCode);

    const data: EmailVerifyData = {
        userId,
        hashedToken,
        hashedCode,
        attempts: 0,
    };

    const tokenIndex: EmailVerifyTokenIndex = {
        email: email.toLowerCase(),
        userId,
    };

    const pipeline = redis.pipeline();
    pipeline.set(KEYS.emailVerifyData(email), JSON.stringify(data), "EX", REDIS_TTL.EMAIL_VERIFY);
    pipeline.set(KEYS.emailVerifyToken(hashedToken), JSON.stringify(tokenIndex), "EX", REDIS_TTL.EMAIL_VERIFY);
    pipeline.set(KEYS.emailVerifyCooldown(email), "1", "EX", REDIS_TTL.COOLDOWN);
    await pipeline.exec();
};

/**
 * Verify email using either token link or 6-digit OTP code
 */
const verifyEmailInRedis = async (
    email: string,
    rawToken?: string,
    rawOtp?: string
): Promise<{ userId: string }> => {
    // 1. Verify via Token link
    if (rawToken) {
        const hashedToken = hashSecret(rawToken);
        const tokenKey = KEYS.emailVerifyToken(hashedToken);
        const tokenData = await getCache<EmailVerifyTokenIndex>(tokenKey);

        if (!tokenData || tokenData.email !== email.toLowerCase()) {
            throw new ApiError(httpStatus.BAD_REQUEST, "Verification link is invalid or has expired.");
        }

        // Cleanup both keys
        await deleteCache([tokenKey, KEYS.emailVerifyData(email)]);
        return { userId: tokenData.userId };
    }

    // 2. Verify via 6-digit Code (OTP)
    if (rawOtp) {
        const dataKey = KEYS.emailVerifyData(email);
        const data = await getCache<EmailVerifyData>(dataKey);

        if (!data) {
            throw new ApiError(httpStatus.BAD_REQUEST, "Verification code is invalid or has expired.");
        }

        if (data.attempts >= REDIS_TTL.MAX_ATTEMPTS) {
            await deleteCache([dataKey, KEYS.emailVerifyToken(data.hashedToken)]);
            throw new ApiError(httpStatus.TOO_MANY_REQUESTS, "Maximum verification attempts exceeded. Please request a new code.");
        }

        const isValid = compareSecret(rawOtp, data.hashedCode);

        if (!isValid) {
            data.attempts += 1;
            if (data.attempts >= REDIS_TTL.MAX_ATTEMPTS) {
                await deleteCache([dataKey, KEYS.emailVerifyToken(data.hashedToken)]);
                throw new ApiError(httpStatus.TOO_MANY_REQUESTS, "Maximum verification attempts exceeded. Please request a new code.");
            }

            const remainingTtl = await redis.ttl(dataKey);
            if (remainingTtl > 0) {
                await setCache(dataKey, data, remainingTtl);
            }

            const remainingAttempts = REDIS_TTL.MAX_ATTEMPTS - data.attempts;
            throw new ApiError(httpStatus.BAD_REQUEST, `Invalid verification code. ${remainingAttempts} attempt(s) remaining.`);
        }

        // Cleanup both keys
        await deleteCache([dataKey, KEYS.emailVerifyToken(data.hashedToken)]);
        return { userId: data.userId };
    }

    throw new ApiError(httpStatus.BAD_REQUEST, "Verification token or code is required.");
};

/* ==========================================================================
   C. Email Update Flow
   ========================================================================= */

interface EmailUpdateData {
    pendingEmail: string;
    hashedToken: string;
    attempts: number;
}

interface EmailUpdateTokenIndex {
    userId: string;
    pendingEmail: string;
}

/**
 * Check if user is in resend cooldown for email update
 */
const checkEmailUpdateCooldown = async (userId: string): Promise<boolean> => {
    const cooldown = await redis.get(KEYS.emailUpdateCooldown(userId));
    return Boolean(cooldown);
};

/**
 * Check if an email is already under pending verification by another user
 */
const checkPendingEmailClaim = async (newEmail: string, currentUserId: string): Promise<boolean> => {
    const claimedBy = await redis.get(KEYS.emailUpdateClaim(newEmail));
    return Boolean(claimedBy && claimedBy !== currentUserId);
};

/**
 * Store pending email change request in Redis
 */
const storeEmailUpdate = async (
    userId: string,
    newEmail: string,
    rawToken: string
): Promise<void> => {
    const hashedToken = hashSecret(rawToken);

    const data: EmailUpdateData = {
        pendingEmail: newEmail.toLowerCase(),
        hashedToken,
        attempts: 0,
    };

    const tokenIndex: EmailUpdateTokenIndex = {
        userId,
        pendingEmail: newEmail.toLowerCase(),
    };

    const pipeline = redis.pipeline();
    pipeline.set(KEYS.emailUpdateData(userId), JSON.stringify(data), "EX", REDIS_TTL.EMAIL_UPDATE);
    pipeline.set(KEYS.emailUpdateToken(hashedToken), JSON.stringify(tokenIndex), "EX", REDIS_TTL.EMAIL_UPDATE);
    pipeline.set(KEYS.emailUpdateClaim(newEmail), userId, "EX", REDIS_TTL.EMAIL_UPDATE);
    pipeline.set(KEYS.emailUpdateCooldown(userId), "1", "EX", REDIS_TTL.COOLDOWN);
    await pipeline.exec();
};

/**
 * Get current pending email update data for user
 */
const getPendingEmailUpdate = async (userId: string): Promise<EmailUpdateData | null> => {
    return getCache<EmailUpdateData>(KEYS.emailUpdateData(userId));
};

/**
 * Verify new email token, consume it atomically, and return userId + pendingEmail
 */
const consumeNewEmailToken = async (
    rawToken: string,
    expectedEmail?: string
): Promise<EmailUpdateTokenIndex> => {
    const hashedToken = hashSecret(rawToken);
    const tokenKey = KEYS.emailUpdateToken(hashedToken);
    const tokenData = await getCache<EmailUpdateTokenIndex>(tokenKey);

    if (!tokenData) {
        throw new ApiError(httpStatus.BAD_REQUEST, "The email verification link is invalid or has expired. Please try again.");
    }

    if (expectedEmail && tokenData.pendingEmail !== expectedEmail.toLowerCase()) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Invalid email verification request.");
    }

    // Atomically consume and cleanup all keys for this request
    const pipeline = redis.pipeline();
    pipeline.del(tokenKey);
    pipeline.del(KEYS.emailUpdateData(tokenData.userId));
    pipeline.del(KEYS.emailUpdateClaim(tokenData.pendingEmail));
    await pipeline.exec();

    return tokenData;
};

/**
 * Clear email update claim if duplicate or cancelled
 */
const clearEmailUpdateClaim = async (userId: string, pendingEmail: string, hashedToken?: string): Promise<void> => {
    const pipeline = redis.pipeline();
    pipeline.del(KEYS.emailUpdateData(userId));
    pipeline.del(KEYS.emailUpdateClaim(pendingEmail));
    if (hashedToken) {
        pipeline.del(KEYS.emailUpdateToken(hashedToken));
    }
    await pipeline.exec();
};

export const authRedis = {
    // Hash & Comparison Utilities
    hashSecret,
    compareSecret,

    // Password Reset
    checkPwdResetCooldown,
    storePwdResetOtp,
    verifyPwdResetOtp,
    storePwdResetToken,
    consumePwdResetToken,

    // Registration Email Verification
    checkEmailVerifyCooldown,
    storeEmailVerification,
    verifyEmailInRedis,

    // Email Update
    checkEmailUpdateCooldown,
    checkPendingEmailClaim,
    storeEmailUpdate,
    getPendingEmailUpdate,
    consumeNewEmailToken,
    clearEmailUpdateClaim,
};
