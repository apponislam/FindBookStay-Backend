export const settingsPaths = {
    "/settings": {
        get: {
            tags: ["User Settings"],
            summary: "Get current user settings",
            description: "Retrieves the authenticated user's notification preferences, privacy options, theme, and language. Auto-initializes default settings if none exist.",
            security: [{ bearerAuth: [] }],
            responses: {
                200: {
                    description: "Settings retrieved successfully.",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/SettingsResponse" },
                        },
                    },
                },
                401: { description: "Unauthorized." },
            },
        },
        patch: {
            tags: ["User Settings"],
            summary: "Update current user settings",
            description: "Deep updates the authenticated user's notification preferences, privacy toggles, and appearance settings.",
            security: [{ bearerAuth: [] }],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/UpdateSettingsRequest" },
                    },
                },
            },
            responses: {
                200: {
                    description: "Settings updated successfully.",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/SettingsResponse" },
                        },
                    },
                },
                401: { description: "Unauthorized." },
            },
        },
    },
    "/settings/reset": {
        post: {
            tags: ["User Settings"],
            summary: "Reset current user settings to defaults",
            description: "Restores all notification, privacy, and theme preferences to their standard factory default values.",
            security: [{ bearerAuth: [] }],
            responses: {
                200: {
                    description: "Settings reset successfully.",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/SettingsResponse" },
                        },
                    },
                },
                401: { description: "Unauthorized." },
            },
        },
    },
    "/settings/user/{userId}": {
        get: {
            tags: ["User Settings (Admin Only)"],
            summary: "Get settings of a specific user",
            description: "Admin endpoint to view the configuration and preferences of any registered user.",
            security: [{ bearerAuth: [] }],
            parameters: [
                {
                    name: "userId",
                    in: "path",
                    required: true,
                    schema: { type: "string" },
                    description: "User ObjectId",
                },
            ],
            responses: {
                200: {
                    description: "User settings retrieved successfully.",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/SettingsResponse" },
                        },
                    },
                },
                401: { description: "Unauthorized." },
                403: { description: "Forbidden. Admin access required." },
            },
        },
    },
};

