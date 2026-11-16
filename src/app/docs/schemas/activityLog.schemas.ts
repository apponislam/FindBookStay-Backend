export const activityLogSchemas = {
    ActivityLogStatus: {
        type: "string",
        enum: ["SUCCESS", "FAILED", "WARNING", "INFO"],
        example: "SUCCESS",
    },
    ActivityLogModule: {
        type: "string",
        enum: ["AUTH", "HOME", "STAY", "TURF", "PROPERTY", "USER", "PAYMENT", "SYSTEM"],
        example: "AUTH",
    },
    ActivityLogItem: {
        type: "object",
        properties: {
            _id: { type: "string", example: "673752e50ad7df43fbe02999" },
            user: { type: "string", nullable: true, example: "673752e50ad7df43fbe02951" },
            role: { type: "string", nullable: true, example: "USER" },
            action: { type: "string", example: "AUTH_LOGIN" },
            module: { $ref: "#/components/schemas/ActivityLogModule" },
            description: { type: "string", example: "User signed in successfully: Appon Islam (user@example.com)" },
            status: { $ref: "#/components/schemas/ActivityLogStatus" },
            ipAddress: { type: "string", example: "103.145.118.2" },
            userAgent: { type: "string", example: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)..." },
            device: { type: "string", example: "Desktop" },
            browser: { type: "string", example: "Chrome" },
            os: { type: "string", example: "Windows 10/11" },
            metadata: { type: "object", example: { attempts: 1 } },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
        },
    },
};

