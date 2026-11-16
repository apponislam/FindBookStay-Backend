export const authPaths = {
    "/auth/register": {
        post: {
            tags: ["Authentication"],
            summary: "Register a new user account",
            description: "Creates a new user in MongoDB, verifies referral codes, runs Sharp image optimization on profile picture (multipart or base64), and dispatches email verification with 6-digit OTP code.",
            requestBody: {
                required: true,
                content: {
                    "multipart/form-data": {
                        schema: { $ref: "#/components/schemas/RegisterRequest" },
                    },
                    "application/json": {
                        schema: { $ref: "#/components/schemas/RegisterRequest" },
                    },
                },
            },
            responses: {
                201: {
                    description: "Account registered successfully. Verification email dispatched.",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/AuthResponse" },
                        },
                    },
                },
                400: {
                    description: "Validation error or email already registered.",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/ApiErrorResponse" },
                        },
                    },
                },
            },
        },
    },
    "/auth/login": {
        post: {
            tags: ["Authentication"],
            summary: "Sign in with email and password",
            description: "Authenticates user credentials, sets refreshToken in httpOnly cookie, optionally registers FCM device token (capped at 5 recent devices), and returns JWT accessToken.",
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/LoginRequest" },
                    },
                },
            },
            responses: {
                200: {
                    description: "Signed in successfully.",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/AuthResponse" },
                        },
                    },
                },
                401: {
                    description: "Incorrect email or password.",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/ApiErrorResponse" },
                        },
                    },
                },
                403: {
                    description: "Account is deactivated.",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/ApiErrorResponse" },
                        },
                    },
                },
            },
        },
    },
    "/auth/verify-email": {
        get: {
            tags: ["Authentication"],
            summary: "Verify email address via token link or OTP code",
            parameters: [
                { name: "email", in: "query", required: true, schema: { type: "string" }, description: "User email address" },
                { name: "token", in: "query", schema: { type: "string" }, description: "Verification token from verification email link" },
                { name: "otp", in: "query", schema: { type: "string" }, description: "6-digit OTP code received in email" },
            ],
            responses: {
                200: {
                    description: "Email verified successfully.",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/ApiResponse" },
                        },
                    },
                },
                400: {
                    description: "Invalid or expired token/OTP code.",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/ApiErrorResponse" },
                        },
                    },
                },
            },
        },
        post: {
            tags: ["Authentication"],
            summary: "Verify email address (POST body support)",
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/VerifyOtpRequest" },
                    },
                },
            },
            responses: {
                200: {
                    description: "Email verified successfully.",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/ApiResponse" },
                        },
                    },
                },
                400: {
                    description: "Invalid or expired verification code.",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/ApiErrorResponse" },
                        },
                    },
                },
            },
        },
    },
    "/auth/resend-verification": {
        post: {
            tags: ["Authentication"],
            summary: "Resend email verification OTP & token",
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: {
                            type: "object",
                            required: ["email"],
                            properties: { email: { type: "string", format: "email" } },
                        },
                    },
                },
            },
            responses: {
                200: {
                    description: "Verification code resent successfully (60-second cooldown applies).",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/ApiResponse" },
                        },
                    },
                },
                429: {
                    description: "Cooldown active. Must wait 60 seconds between resends.",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/ApiErrorResponse" },
                        },
                    },
                },
            },
        },
    },
    "/auth/refresh-token": {
        post: {
            tags: ["Authentication"],
            summary: "Refresh access token using refreshToken cookie",
            description: "Validates refreshToken from httpOnly cookie or request body, checks user active status, and issues a fresh accessToken.",
            responses: {
                200: {
                    description: "Access token refreshed successfully.",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    success: { type: "boolean", example: true },
                                    message: { type: "string", example: "Access token refreshed successfully." },
                                    data: {
                                        type: "object",
                                        properties: {
                                            accessToken: { type: "string" },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                401: { description: "Invalid or expired refresh token." },
            },
        },
    },
    "/auth/forgot-password": {
        post: {
            tags: ["Authentication"],
            summary: "Request password reset OTP",
            description: "Sends a 6-digit OTP code to the provided email with 5-minute validity and 60-second cooldown.",
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: {
                            type: "object",
                            required: ["email"],
                            properties: { email: { type: "string", format: "email" } },
                        },
                    },
                },
            },
            responses: {
                200: {
                    description: "Password reset OTP sent to email if account exists.",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/ApiResponse" },
                        },
                    },
                },
            },
        },
    },
    "/auth/verify-otp": {
        post: {
            tags: ["Authentication"],
            summary: "Verify password reset OTP",
            description: "Verifies the 6-digit OTP code (max 5 attempts) and exchanges it for a 10-minute reset token.",
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/VerifyOtpRequest" },
                    },
                },
            },
            responses: {
                200: {
                    description: "OTP verified. Returns reset token.",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    success: { type: "boolean", example: true },
                                    message: { type: "string", example: "OTP verified successfully." },
                                    data: {
                                        type: "object",
                                        properties: {
                                            token: { type: "string" },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    },
    "/auth/resend-otp": {
        post: {
            tags: ["Authentication"],
            summary: "Resend password reset OTP",
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: {
                            type: "object",
                            required: ["email"],
                            properties: { email: { type: "string", format: "email" } },
                        },
                    },
                },
            },
            responses: {
                200: { description: "OTP resent successfully." },
                429: { description: "Cooldown in effect. Wait 60 seconds." },
            },
        },
    },
    "/auth/reset-password": {
        post: {
            tags: ["Authentication"],
            summary: "Reset password using reset token",
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/ResetPasswordRequest" },
                    },
                },
            },
            responses: {
                200: { description: "Password reset successfully. You can now log in." },
                400: { description: "Invalid or expired token, or same as previous password." },
            },
        },
    },
    "/auth/referral/{code}": {
        get: {
            tags: ["Authentication"],
            summary: "Validate referral code",
            parameters: [
                { name: "code", in: "path", required: true, schema: { type: "string" }, example: "VMOPEPTW" },
            ],
            responses: {
                200: {
                    description: "Referral code verified successfully.",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    success: { type: "boolean", example: true },
                                    message: { type: "string", example: "Referral code verified successfully." },
                                    data: {
                                        type: "object",
                                        properties: {
                                            valid: { type: "boolean", example: true },
                                            referralCode: { type: "string", example: "VMOPEPTW" },
                                            referrerId: { type: "string" },
                                            referrerName: { type: "string" },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                404: { description: "Referral code does not exist." },
            },
        },
    },
    "/auth/me": {
        get: {
            tags: ["User Profile"],
            summary: "Get current authenticated user profile",
            security: [{ bearerAuth: [] }],
            responses: {
                200: {
                    description: "Current user profile data.",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    success: { type: "boolean", example: true },
                                    data: { $ref: "#/components/schemas/User" },
                                },
                            },
                        },
                    },
                },
                401: { description: "Unauthorized. Missing or invalid Bearer token." },
            },
        },
        delete: {
            tags: ["User Profile"],
            summary: "Delete current user account (soft delete)",
            security: [{ bearerAuth: [] }],
            responses: {
                200: { description: "Account deleted successfully." },
                401: { description: "Unauthorized." },
            },
        },
    },
    "/auth/logout": {
        post: {
            tags: ["Authentication"],
            summary: "Log out user",
            security: [{ bearerAuth: [] }],
            responses: {
                200: { description: "Logged out successfully. Cookie cleared." },
            },
        },
    },
    "/auth/profile": {
        patch: {
            tags: ["User Profile"],
            summary: "Update user profile details",
            description: "Updates profile fields with Sharp image compression support (for multipart file or base64) and automatic JSON parsing.",
            security: [{ bearerAuth: [] }],
            requestBody: {
                content: {
                    "multipart/form-data": {
                        schema: { $ref: "#/components/schemas/UpdateProfileRequest" },
                    },
                    "application/json": {
                        schema: { $ref: "#/components/schemas/UpdateProfileRequest" },
                    },
                },
            },
            responses: {
                200: {
                    description: "Profile updated successfully.",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    success: { type: "boolean", example: true },
                                    message: { type: "string", example: "Profile updated successfully." },
                                    data: { $ref: "#/components/schemas/User" },
                                },
                            },
                        },
                    },
                },
                401: { description: "Unauthorized." },
            },
        },
    },
    "/auth/change-password": {
        post: {
            tags: ["User Profile"],
            summary: "Change account password",
            security: [{ bearerAuth: [] }],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/ChangePasswordRequest" },
                    },
                },
            },
            responses: {
                200: { description: "Password changed successfully." },
                400: { description: "Incorrect current password." },
                401: { description: "Unauthorized." },
            },
        },
    },
    "/auth/update-email": {
        post: {
            tags: ["User Profile"],
            summary: "Request email address change",
            security: [{ bearerAuth: [] }],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/UpdateEmailRequest" },
                    },
                },
            },
            responses: {
                200: { description: "Verification link dispatched to new email address." },
                400: { description: "Email already registered or incorrect password." },
            },
        },
    },
    "/auth/verify-new-email": {
        get: {
            tags: ["User Profile"],
            summary: "Confirm and finalize new email address",
            parameters: [
                { name: "token", in: "query", required: true, schema: { type: "string" } },
                { name: "email", in: "query", required: true, schema: { type: "string" } },
            ],
            responses: {
                200: { description: "New email address verified and updated successfully." },
                400: { description: "Invalid or expired token." },
            },
        },
    },
    "/auth/fcm-token": {
        post: {
            tags: ["Notifications (FCM)"],
            summary: "Register FCM device token for push notifications",
            security: [{ bearerAuth: [] }],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/FcmTokenRequest" },
                    },
                },
            },
            responses: {
                200: { description: "FCM token registered (capped at 5 recent devices)." },
            },
        },
        delete: {
            tags: ["Notifications (FCM)"],
            summary: "Unregister FCM device token upon device logout",
            security: [{ bearerAuth: [] }],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/FcmTokenRequest" },
                    },
                },
            },
            responses: {
                200: { description: "FCM device token removed." },
            },
        },
    },
};

