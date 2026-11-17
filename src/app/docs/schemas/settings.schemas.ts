export const settingsSchemas = {
    UpdateSettingsRequest: {
        type: "object",
        properties: {
            notifications: {
                type: "object",
                properties: {
                    emailNotifications: {
                        type: "object",
                        properties: {
                            bookings: { type: "boolean", example: true },
                            messages: { type: "boolean", example: true },
                            promotions: { type: "boolean", example: false },
                            accountAlerts: { type: "boolean", example: true },
                        },
                    },
                    pushNotifications: {
                        type: "object",
                        properties: {
                            bookings: { type: "boolean", example: true },
                            messages: { type: "boolean", example: true },
                            promotions: { type: "boolean", example: false },
                            reminders: { type: "boolean", example: true },
                        },
                    },
                    smsNotifications: {
                        type: "object",
                        properties: {
                            bookingAlerts: { type: "boolean", example: true },
                            securityAlerts: { type: "boolean", example: true },
                        },
                    },
                },
            },
            privacy: {
                type: "object",
                properties: {
                    showProfilePublicly: { type: "boolean", example: true },
                    showOnlineStatus: { type: "boolean", example: true },
                    showLastSeen: { type: "boolean", example: true },
                    allowDirectMessages: { type: "boolean", example: true },
                },
            },
            preferences: {
                type: "object",
                properties: {
                    theme: { type: "string", enum: ["light", "dark", "system"], example: "system" },
                    language: { type: "string", example: "en" },
                    currency: { type: "string", example: "BDT" },
                    timezone: { type: "string", example: "Asia/Dhaka" },
                },
            },
        },
    },
    SettingsResponse: {
        type: "object",
        properties: {
            success: { type: "boolean", example: true },
            message: { type: "string", example: "Settings retrieved successfully." },
            data: {
                type: "object",
                properties: {
                    _id: { type: "string", example: "6670e123f8194b321a000007" },
                    user: { type: "string", example: "6640c432d4310e543a000001" },
                    notifications: { type: "object" },
                    privacy: { type: "object" },
                    preferences: { type: "object" },
                    createdAt: { type: "string", format: "date-time" },
                    updatedAt: { type: "string", format: "date-time" },
                },
            },
        },
    },
};

