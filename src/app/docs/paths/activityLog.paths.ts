export const activityLogPaths = {
    "/activity-logs": {
        get: {
            tags: ["Activity & Audit Logs"],
            summary: "Get activity logs with filtering and pagination (Admin Only)",
            security: [{ bearerAuth: [] }],
            parameters: [
                { name: "page", in: "query", schema: { type: "integer", default: 1 } },
                { name: "limit", in: "query", schema: { type: "integer", default: 10 } },
                { name: "sortBy", in: "query", schema: { type: "string", default: "createdAt" } },
                { name: "sortOrder", in: "query", schema: { type: "string", enum: ["asc", "desc"], default: "desc" } },
                { name: "search", in: "query", schema: { type: "string" }, description: "Search by description, action, IP, or userAgent" },
                { name: "module", in: "query", schema: { $ref: "#/components/schemas/ActivityLogModule" } },
                { name: "action", in: "query", schema: { type: "string" } },
                { name: "status", in: "query", schema: { $ref: "#/components/schemas/ActivityLogStatus" } },
                { name: "userId", in: "query", schema: { type: "string" } },
                { name: "startDate", in: "query", schema: { type: "string", format: "date" } },
                { name: "endDate", in: "query", schema: { type: "string", format: "date" } },
            ],
            responses: {
                200: {
                    description: "Paginated list of activity logs.",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    success: { type: "boolean", example: true },
                                    meta: { $ref: "#/components/schemas/PaginationMeta" },
                                    data: {
                                        type: "array",
                                        items: { $ref: "#/components/schemas/ActivityLogItem" },
                                    },
                                },
                            },
                        },
                    },
                },
                403: { description: "Forbidden. Admin role required." },
            },
        },
    },
    "/activity-logs/purge": {
        delete: {
            tags: ["Activity & Audit Logs"],
            summary: "Purge old activity logs (Admin Only)",
            description: "Deletes activity logs older than specified days (default: 90 days).",
            security: [{ bearerAuth: [] }],
            parameters: [
                { name: "days", in: "query", schema: { type: "integer", default: 90 } },
            ],
            responses: {
                200: {
                    description: "Old activity logs purged successfully.",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    success: { type: "boolean", example: true },
                                    message: { type: "string", example: "Successfully purged 240 logs older than 90 days." },
                                    data: {
                                        type: "object",
                                        properties: {
                                            deletedCount: { type: "integer", example: 240 },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                403: { description: "Forbidden. Admin role required." },
            },
        },
    },
    "/activity-logs/{id}": {
        get: {
            tags: ["Activity & Audit Logs"],
            summary: "Get activity log by ID (Admin Only)",
            security: [{ bearerAuth: [] }],
            parameters: [
                { name: "id", in: "path", required: true, schema: { type: "string" } },
            ],
            responses: {
                200: {
                    description: "Activity log details.",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    success: { type: "boolean", example: true },
                                    data: { $ref: "#/components/schemas/ActivityLogItem" },
                                },
                            },
                        },
                    },
                },
                404: { description: "Log not found." },
            },
        },
        delete: {
            tags: ["Activity & Audit Logs"],
            summary: "Delete activity log by ID (Admin Only)",
            security: [{ bearerAuth: [] }],
            parameters: [
                { name: "id", in: "path", required: true, schema: { type: "string" } },
            ],
            responses: {
                200: { description: "Log deleted successfully." },
                404: { description: "Log not found." },
            },
        },
    },
};

