export const commonSchemas = {
    ApiResponse: {
        type: "object",
        properties: {
            success: { type: "boolean", example: true },
            message: { type: "string", example: "Operation completed successfully." },
            data: { type: "object", nullable: true },
        },
    },
    ApiErrorResponse: {
        type: "object",
        properties: {
            success: { type: "boolean", example: false },
            message: { type: "string", example: "Error message describing what went wrong." },
            errorSources: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        path: { type: "string", example: "email" },
                        message: { type: "string", example: "Please enter a valid email address." },
                    },
                },
            },
            stack: { type: "string", nullable: true },
        },
    },
    PaginationMeta: {
        type: "object",
        properties: {
            page: { type: "integer", example: 1 },
            limit: { type: "integer", example: 10 },
            total: { type: "integer", example: 45 },
            totalPages: { type: "integer", example: 5 },
        },
    },
};

