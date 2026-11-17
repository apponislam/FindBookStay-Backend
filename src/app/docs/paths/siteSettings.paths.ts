export const siteSettingsPaths = {
    "/site-settings": {
        get: {
            tags: ["Site Settings"],
            summary: "Get global site & platform settings",
            description: "Public endpoint for web and mobile apps to fetch branding, maintenance mode status, minimum supported app versions, platform commission rates, and contact info.",
            responses: {
                200: {
                    description: "Site settings retrieved successfully.",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/SiteSettingsResponse" },
                        },
                    },
                },
            },
        },
        patch: {
            tags: ["Site Settings (Admin Only)"],
            summary: "Update global site & platform settings",
            description: "Admin endpoint to update platform branding, business rules (commissions, advance hours), social links, mobile app update requirements, and maintenance mode. Supports JSON and multipart form-data for logo/favicon uploads.",
            security: [{ bearerAuth: [] }],
            requestBody: {
                required: true,
                content: {
                    "multipart/form-data": {
                        schema: { $ref: "#/components/schemas/UpdateSiteSettingsRequest" },
                    },
                    "application/json": {
                        schema: { $ref: "#/components/schemas/UpdateSiteSettingsRequest" },
                    },
                },
            },
            responses: {
                200: {
                    description: "Site settings updated successfully.",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/SiteSettingsResponse" },
                        },
                    },
                },
                401: { description: "Unauthorized." },
                403: { description: "Forbidden. Admin access required." },
            },
        },
    },
};

