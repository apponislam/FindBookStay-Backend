export const authSchemas = {
    UserAddress: {
        type: "object",
        properties: {
            street: { type: "string", example: "House 42, Road 11, Block D" },
            city: { type: "string", example: "Dhaka" },
            state: { type: "string", example: "Dhaka Division" },
            zipCode: { type: "string", example: "1212" },
            country: { type: "string", example: "Bangladesh" },
            location: {
                type: "object",
                properties: {
                    type: { type: "string", enum: ["Point"], example: "Point" },
                    coordinates: {
                        type: "array",
                        items: { type: "number" },
                        example: [90.4125, 23.8103],
                        description: "[longitude, latitude] for GeoJSON 2dsphere indexing",
                    },
                },
            },
        },
    },
    User: {
        type: "object",
        properties: {
            _id: { type: "string", example: "673752e50ad7df43fbe02951" },
            name: { type: "string", example: "Appon Islam" },
            email: { type: "string", format: "email", example: "apponislamdev@gmail.com" },
            role: { type: "string", enum: ["ADMIN", "USER"], example: "USER" },
            phone: { type: "string", example: "+8801700000000" },
            profileImage: { type: "string", example: "/uploads/profile/profile-1731718800000-123456789.webp" },
            language: { type: "string", example: "en" },
            presentAddress: { $ref: "#/components/schemas/UserAddress" },
            permanentAddress: { $ref: "#/components/schemas/UserAddress" },
            referralCode: { type: "string", example: "VMOPEPTW" },
            referredBy: { type: "string", nullable: true, example: null },
            isWrongReferral: { type: "boolean", example: false },
            wrongReferralCode: { type: "string", nullable: true, example: null },
            fcmTokens: {
                type: "array",
                items: { type: "string" },
                example: ["fcm_token_device_abc123"],
            },
            hasHome: { type: "boolean", example: false },
            hasStay: { type: "boolean", example: false },
            hasTurf: { type: "boolean", example: false },
            hasProperty: { type: "boolean", example: false },
            isActive: { type: "boolean", example: true },
            isEmailVerified: { type: "boolean", example: true },
            isDeleted: { type: "boolean", example: false },
            lastLogin: { type: "string", format: "date-time" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
        },
    },
    RegisterRequest: {
        type: "object",
        required: ["name", "email", "password"],
        properties: {
            name: { type: "string", example: "Appon Islam" },
            email: { type: "string", format: "email", example: "newuser@example.com" },
            password: { type: "string", format: "password", example: "P@ssword123!" },
            role: { type: "string", enum: ["USER", "ADMIN"], default: "USER" },
            phone: { type: "string", example: "+8801700000000" },
            profileImage: {
                type: "string",
                format: "binary",
                description: "Binary image file (.jpg, .jpeg, .png, .webp) or base64 data URI (auto-optimized via Sharp to WebP)",
            },
            presentAddress: { $ref: "#/components/schemas/UserAddress" },
            permanentAddress: { $ref: "#/components/schemas/UserAddress" },
            referralCode: { type: "string", example: "VMOPEPTW", description: "Optional 8-character referral code of referring user" },
        },
    },
    LoginRequest: {
        type: "object",
        required: ["email", "password"],
        properties: {
            email: { type: "string", format: "email", example: "user@example.com" },
            password: { type: "string", format: "password", example: "P@ssword123!" },
            fcmToken: { type: "string", example: "fcm_token_device_abc123", description: "Optional FCM token for push notifications" },
        },
    },
    AuthResponse: {
        type: "object",
        properties: {
            success: { type: "boolean", example: true },
            message: { type: "string", example: "Signed in successfully." },
            data: {
                type: "object",
                properties: {
                    user: { $ref: "#/components/schemas/User" },
                    accessToken: { type: "string", example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." },
                },
            },
        },
    },
    VerifyOtpRequest: {
        type: "object",
        required: ["email", "otp"],
        properties: {
            email: { type: "string", format: "email", example: "user@example.com" },
            otp: { type: "string", example: "123456" },
        },
    },
    ResetPasswordRequest: {
        type: "object",
        required: ["token", "newPassword"],
        properties: {
            token: { type: "string", example: "reset_token_hex_or_from_query" },
            newPassword: { type: "string", format: "password", example: "NewP@ssword123!" },
        },
    },
    ChangePasswordRequest: {
        type: "object",
        required: ["currentPassword", "newPassword"],
        properties: {
            currentPassword: { type: "string", format: "password", example: "OldP@ssword123!" },
            newPassword: { type: "string", format: "password", example: "NewP@ssword123!" },
        },
    },
    UpdateEmailRequest: {
        type: "object",
        required: ["newEmail", "password"],
        properties: {
            newEmail: { type: "string", format: "email", example: "newemail@example.com" },
            password: { type: "string", format: "password", example: "CurrentPassword123!" },
        },
    },
    UpdateProfileRequest: {
        type: "object",
        properties: {
            name: { type: "string", example: "Updated Name" },
            phone: { type: "string", example: "+8801799999999" },
            profileImage: {
                type: "string",
                format: "binary",
                description: "Binary file upload via form-data or Base64 string",
            },
            language: { type: "string", example: "bn" },
            presentAddress: { $ref: "#/components/schemas/UserAddress" },
            permanentAddress: { $ref: "#/components/schemas/UserAddress" },
            fcmTokens: { type: "array", items: { type: "string" } },
            hasHome: { type: "boolean" },
            hasStay: { type: "boolean" },
            hasTurf: { type: "boolean" },
            hasProperty: { type: "boolean" },
        },
    },
    FcmTokenRequest: {
        type: "object",
        required: ["fcmToken"],
        properties: {
            fcmToken: { type: "string", example: "fcm_token_device_abc123" },
        },
    },
};

