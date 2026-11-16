export const policyPaths = {
    "/policies/type/{typeOrSlug}": {
        get: {
            tags: ["Policies & Legal"],
            summary: "Get policy by type or slug",
            description: "Fetches active legal policy (e.g., TERMS_AND_CONDITIONS, PRIVACY_POLICY) by type enum or SEO-friendly URL slug.",
            parameters: [
                {
                    name: "typeOrSlug",
                    in: "path",
                    required: true,
                    schema: { type: "string" },
                    example: "TERMS_AND_CONDITIONS",
                },
            ],
            responses: {
                200: {
                    description: "Policy content.",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    success: { type: "boolean", example: true },
                                    data: { $ref: "#/components/schemas/PolicyItem" },
                                },
                            },
                        },
                    },
                },
                404: { description: "Policy not found or inactive." },
            },
        },
    },
    "/policies": {
        get: {
            tags: ["Policies & Legal"],
            summary: "Get all policies",
            parameters: [
                { name: "type", in: "query", schema: { $ref: "#/components/schemas/PolicyType" } },
                { name: "isActive", in: "query", schema: { type: "boolean" } },
            ],
            responses: {
                200: {
                    description: "List of policies.",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    success: { type: "boolean", example: true },
                                    data: {
                                        type: "array",
                                        items: { $ref: "#/components/schemas/PolicyItem" },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        post: {
            tags: ["Policies & Legal"],
            summary: "Create or upsert a policy (Admin Only)",
            security: [{ bearerAuth: [] }],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/CreateOrUpdatePolicyRequest" },
                    },
                },
            },
            responses: {
                201: {
                    description: "Policy saved successfully.",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    success: { type: "boolean", example: true },
                                    message: { type: "string", example: "Policy published successfully." },
                                    data: { $ref: "#/components/schemas/PolicyItem" },
                                },
                            },
                        },
                    },
                },
                403: { description: "Forbidden. Admin role required." },
            },
        },
    },
    "/policies/{id}": {
        patch: {
            tags: ["Policies & Legal"],
            summary: "Update existing policy (Admin Only)",
            security: [{ bearerAuth: [] }],
            parameters: [
                { name: "id", in: "path", required: true, schema: { type: "string" } },
            ],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/UpdatePolicyRequest" },
                    },
                },
            },
            responses: {
                200: { description: "Policy updated successfully." },
                403: { description: "Forbidden. Admin role required." },
                404: { description: "Policy not found." },
            },
        },
        delete: {
            tags: ["Policies & Legal"],
            summary: "Delete policy (Admin Only)",
            security: [{ bearerAuth: [] }],
            parameters: [
                { name: "id", in: "path", required: true, schema: { type: "string" } },
            ],
            responses: {
                200: { description: "Policy deleted successfully." },
                403: { description: "Forbidden. Admin role required." },
                404: { description: "Policy not found." },
            },
        },
    },
};

