export const reportPaths = {
    "/reports": {
        post: {
            tags: ["Trust & Safety (Reports)"],
            summary: "Submit report against a listing or user",
            description: "Allows authenticated users to file a moderation report against a fraudulent/abusive listing or user with evidence.",
            security: [{ bearerAuth: [] }],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/CreateReportRequest" },
                    },
                },
            },
            responses: {
                201: {
                    description: "Report filed successfully",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    statusCode: { type: "number", example: 201 },
                                    success: { type: "boolean", example: true },
                                    message: { type: "string", example: "Report submitted successfully. Our Trust & Safety team will review it." },
                                    data: { $ref: "#/components/schemas/ReportItem" },
                                },
                            },
                        },
                    },
                },
                400: { $ref: "#/components/schemas/ApiErrorResponse" },
                401: { $ref: "#/components/schemas/ApiErrorResponse" },
                409: { $ref: "#/components/schemas/ApiErrorResponse" },
            },
        },
        get: {
            tags: ["Trust & Safety (Admin Only)"],
            summary: "Browse all moderation reports",
            description: "Admin endpoint to view, filter, and prioritize reports across the entire marketplace.",
            security: [{ bearerAuth: [] }],
            parameters: [
                { name: "status", in: "query", schema: { $ref: "#/components/schemas/ReportStatus" } },
                { name: "targetType", in: "query", schema: { $ref: "#/components/schemas/ReportTargetType" } },
                { name: "priority", in: "query", schema: { $ref: "#/components/schemas/ReportPriority" } },
                { name: "reason", in: "query", schema: { $ref: "#/components/schemas/ReportReason" } },
                { name: "search", in: "query", schema: { type: "string" } },
                { name: "page", in: "query", schema: { type: "integer", default: 1 } },
                { name: "limit", in: "query", schema: { type: "integer", default: 15 } },
            ],
            responses: {
                200: {
                    description: "Reports retrieved successfully",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    statusCode: { type: "number", example: 200 },
                                    success: { type: "boolean", example: true },
                                    message: { type: "string", example: "All reports retrieved successfully." },
                                    meta: { $ref: "#/components/schemas/PaginationMeta" },
                                    data: {
                                        type: "array",
                                        items: { $ref: "#/components/schemas/ReportItem" },
                                    },
                                },
                            },
                        },
                    },
                },
                401: { $ref: "#/components/schemas/ApiErrorResponse" },
                403: { $ref: "#/components/schemas/ApiErrorResponse" },
            },
        },
    },

    "/reports/my-reports": {
        get: {
            tags: ["Trust & Safety (Reports)"],
            summary: "Get my submitted reports",
            description: "Returns all reports filed by the authenticated user along with their review status.",
            security: [{ bearerAuth: [] }],
            parameters: [
                { name: "status", in: "query", schema: { $ref: "#/components/schemas/ReportStatus" } },
                { name: "targetType", in: "query", schema: { $ref: "#/components/schemas/ReportTargetType" } },
                { name: "page", in: "query", schema: { type: "integer", default: 1 } },
                { name: "limit", in: "query", schema: { type: "integer", default: 10 } },
            ],
            responses: {
                200: {
                    description: "User reports retrieved successfully",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    statusCode: { type: "number", example: 200 },
                                    success: { type: "boolean", example: true },
                                    message: { type: "string", example: "Your reports retrieved successfully." },
                                    meta: { $ref: "#/components/schemas/PaginationMeta" },
                                    data: {
                                        type: "array",
                                        items: { $ref: "#/components/schemas/ReportItem" },
                                    },
                                },
                            },
                        },
                    },
                },
                401: { $ref: "#/components/schemas/ApiErrorResponse" },
            },
        },
    },

    "/reports/admin/stats": {
        get: {
            tags: ["Trust & Safety (Admin Only)"],
            summary: "Moderation reports overview stats",
            description: "Aggregated counts for pending, under-review, resolved reports and breakdown by target type.",
            security: [{ bearerAuth: [] }],
            responses: {
                200: {
                    description: "Statistics retrieved successfully",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    statusCode: { type: "number", example: 200 },
                                    success: { type: "boolean", example: true },
                                    message: { type: "string", example: "Report statistics retrieved successfully." },
                                    data: {
                                        type: "object",
                                        properties: {
                                            totalReports: { type: "number", example: 45 },
                                            pendingReports: { type: "number", example: 12 },
                                            underReviewReports: { type: "number", example: 5 },
                                            resolvedReports: { type: "number", example: 25 },
                                            dismissedReports: { type: "number", example: 3 },
                                            byTargetType: {
                                                type: "object",
                                                properties: {
                                                    LISTING: { type: "number", example: 34 },
                                                    USER: { type: "number", example: 11 },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                401: { $ref: "#/components/schemas/ApiErrorResponse" },
                403: { $ref: "#/components/schemas/ApiErrorResponse" },
            },
        },
    },

    "/reports/{id}": {
        get: {
            tags: ["Trust & Safety (Reports)"],
            summary: "Get report details by ID",
            description: "Inspect details of a filed report. Accessible by the filing reporter or platform Admins.",
            security: [{ bearerAuth: [] }],
            parameters: [
                { name: "id", in: "path", required: true, schema: { type: "string" } },
            ],
            responses: {
                200: {
                    description: "Report details retrieved successfully",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    statusCode: { type: "number", example: 200 },
                                    success: { type: "boolean", example: true },
                                    message: { type: "string", example: "Report details retrieved successfully." },
                                    data: { $ref: "#/components/schemas/ReportItem" },
                                },
                            },
                        },
                    },
                },
                401: { $ref: "#/components/schemas/ApiErrorResponse" },
                403: { $ref: "#/components/schemas/ApiErrorResponse" },
                404: { $ref: "#/components/schemas/ApiErrorResponse" },
            },
        },
    },

    "/reports/{id}/resolve": {
        patch: {
            tags: ["Trust & Safety (Admin Only)"],
            summary: "Resolve or dismiss a moderation report",
            description: "Update report status to UNDER_REVIEW, RESOLVED, or DISMISSED with moderator notes and recorded action.",
            security: [{ bearerAuth: [] }],
            parameters: [
                { name: "id", in: "path", required: true, schema: { type: "string" } },
            ],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/UpdateReportStatusRequest" },
                    },
                },
            },
            responses: {
                200: {
                    description: "Report updated successfully",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    statusCode: { type: "number", example: 200 },
                                    success: { type: "boolean", example: true },
                                    message: { type: "string", example: "Report marked as RESOLVED." },
                                    data: { $ref: "#/components/schemas/ReportItem" },
                                },
                            },
                        },
                    },
                },
                401: { $ref: "#/components/schemas/ApiErrorResponse" },
                403: { $ref: "#/components/schemas/ApiErrorResponse" },
                404: { $ref: "#/components/schemas/ApiErrorResponse" },
            },
        },
    },
};

