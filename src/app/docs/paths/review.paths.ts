export const reviewPaths = {
    "/reviews/listing/{listingId}": {
        get: {
            tags: ["Reviews & Ratings"],
            summary: "Get all reviews for a listing",
            description: "Retrieves paginated reviews for a specific property/venue along with a 1-to-5 star rating breakdown distribution.",
            parameters: [
                {
                    name: "listingId",
                    in: "path",
                    required: true,
                    schema: { type: "string" },
                    description: "Target listing MongoDB ID",
                },
                { name: "rating", in: "query", schema: { type: "integer", minimum: 1, maximum: 5 }, description: "Filter by specific star rating (1-5)" },
                { name: "page", in: "query", schema: { type: "integer", default: 1 } },
                { name: "limit", in: "query", schema: { type: "integer", default: 10 } },
                { name: "sortBy", in: "query", schema: { type: "string", enum: ["createdAt", "rating"] } },
                { name: "sortOrder", in: "query", schema: { type: "string", enum: ["asc", "desc"], default: "desc" } },
            ],
            responses: {
                200: {
                    description: "Reviews retrieved successfully",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    statusCode: { type: "number", example: 200 },
                                    success: { type: "boolean", example: true },
                                    message: { type: "string", example: "Reviews retrieved successfully." },
                                    meta: {
                                        type: "object",
                                        properties: {
                                            page: { type: "number", example: 1 },
                                            limit: { type: "number", example: 10 },
                                            total: { type: "number", example: 24 },
                                            totalPages: { type: "number", example: 3 },
                                            hasNext: { type: "boolean", example: true },
                                            hasPrev: { type: "boolean", example: false },
                                            ratingBreakdown: {
                                                type: "object",
                                                properties: {
                                                    1: { type: "number", example: 0 },
                                                    2: { type: "number", example: 1 },
                                                    3: { type: "number", example: 2 },
                                                    4: { type: "number", example: 6 },
                                                    5: { type: "number", example: 15 },
                                                },
                                            },
                                        },
                                    },
                                    data: {
                                        type: "array",
                                        items: { $ref: "#/components/schemas/ReviewItem" },
                                    },
                                },
                            },
                        },
                    },
                },
                400: { $ref: "#/components/schemas/ApiErrorResponse" },
            },
        },
    },

    "/reviews": {
        post: {
            tags: ["Reviews & Ratings"],
            summary: "Submit review for a listing",
            description: "Allows an authenticated user to leave a review (1-5 stars with comments and optional sub-ratings). Automatically updates the listing's average rating and total reviews count.",
            security: [{ bearerAuth: [] }],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/CreateReviewRequest" },
                    },
                },
            },
            responses: {
                201: {
                    description: "Review created successfully",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    statusCode: { type: "number", example: 201 },
                                    success: { type: "boolean", example: true },
                                    message: { type: "string", example: "Review submitted successfully. Thank you for your feedback!" },
                                    data: { $ref: "#/components/schemas/ReviewItem" },
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
            tags: ["Reviews & Ratings (Admin Only)"],
            summary: "Browse all reviews across the platform",
            description: "Admin endpoint to monitor, moderate, and inspect reviews across all properties.",
            security: [{ bearerAuth: [] }],
            parameters: [
                { name: "listingId", in: "query", schema: { type: "string" } },
                { name: "userId", in: "query", schema: { type: "string" } },
                { name: "rating", in: "query", schema: { type: "integer" } },
                { name: "page", in: "query", schema: { type: "integer", default: 1 } },
                { name: "limit", in: "query", schema: { type: "integer", default: 15 } },
            ],
            responses: {
                200: {
                    description: "Reviews retrieved successfully",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    statusCode: { type: "number", example: 200 },
                                    success: { type: "boolean", example: true },
                                    message: { type: "string", example: "All reviews retrieved successfully." },
                                    meta: { $ref: "#/components/schemas/PaginationMeta" },
                                    data: {
                                        type: "array",
                                        items: { $ref: "#/components/schemas/ReviewItem" },
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

    "/reviews/my-reviews": {
        get: {
            tags: ["Reviews & Ratings"],
            summary: "Get current user's submitted reviews",
            description: "Retrieves all reviews written by the authenticated user, populated with listing summary details.",
            security: [{ bearerAuth: [] }],
            parameters: [
                { name: "page", in: "query", schema: { type: "integer", default: 1 } },
                { name: "limit", in: "query", schema: { type: "integer", default: 10 } },
            ],
            responses: {
                200: {
                    description: "My reviews retrieved successfully",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    statusCode: { type: "number", example: 200 },
                                    success: { type: "boolean", example: true },
                                    message: { type: "string", example: "My reviews retrieved successfully." },
                                    meta: { $ref: "#/components/schemas/PaginationMeta" },
                                    data: {
                                        type: "array",
                                        items: { $ref: "#/components/schemas/ReviewItem" },
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

    "/reviews/{id}": {
        patch: {
            tags: ["Reviews & Ratings"],
            summary: "Update review",
            description: "Allows the review author to update rating or comment text.",
            security: [{ bearerAuth: [] }],
            parameters: [
                { name: "id", in: "path", required: true, schema: { type: "string" } },
            ],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/UpdateReviewRequest" },
                    },
                },
            },
            responses: {
                200: {
                    description: "Review updated successfully",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    statusCode: { type: "number", example: 200 },
                                    success: { type: "boolean", example: true },
                                    message: { type: "string", example: "Review updated successfully." },
                                    data: { $ref: "#/components/schemas/ReviewItem" },
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
        delete: {
            tags: ["Reviews & Ratings"],
            summary: "Delete review (Soft delete)",
            description: "Allows author or Admin to delete a review. Recalculates the listing rating automatically.",
            security: [{ bearerAuth: [] }],
            parameters: [
                { name: "id", in: "path", required: true, schema: { type: "string" } },
            ],
            responses: {
                200: {
                    description: "Review deleted successfully",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    statusCode: { type: "number", example: 200 },
                                    success: { type: "boolean", example: true },
                                    message: { type: "string", example: "Review deleted successfully." },
                                    data: {
                                        type: "object",
                                        properties: {
                                            message: { type: "string", example: "Review deleted successfully." },
                                        },
                                    },
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

    "/reviews/{id}/reply": {
        patch: {
            tags: ["Reviews & Ratings"],
            summary: "Host reply to a review",
            description: "Allows the listing host or an Admin to reply to a guest review.",
            security: [{ bearerAuth: [] }],
            parameters: [
                { name: "id", in: "path", required: true, schema: { type: "string" } },
            ],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/ReplyReviewRequest" },
                    },
                },
            },
            responses: {
                200: {
                    description: "Reply added successfully",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    statusCode: { type: "number", example: 200 },
                                    success: { type: "boolean", example: true },
                                    message: { type: "string", example: "Reply added successfully." },
                                    data: { $ref: "#/components/schemas/ReviewItem" },
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
};

