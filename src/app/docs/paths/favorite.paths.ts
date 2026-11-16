export const favoritePaths = {
    "/favorites/toggle": {
        post: {
            tags: ["Favorites & Wishlist"],
            summary: "Toggle favorite listing (Save / Remove)",
            description: "One-click toggle to save a listing to the user's favorites or remove it if already saved. Accepts optional private note.",
            security: [{ bearerAuth: [] }],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/ToggleFavoriteRequest" },
                    },
                },
            },
            responses: {
                200: {
                    description: "Toggle action completed successfully",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    statusCode: { type: "number", example: 200 },
                                    success: { type: "boolean", example: true },
                                    message: { type: "string", example: "Listing saved to favorites successfully." },
                                    data: {
                                        type: "object",
                                        properties: {
                                            isFavorite: { type: "boolean", example: true },
                                            message: { type: "string", example: "Listing saved to favorites successfully." },
                                            data: { $ref: "#/components/schemas/FavoriteItem" },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                400: { $ref: "#/components/schemas/ApiErrorResponse" },
                401: { $ref: "#/components/schemas/ApiErrorResponse" },
            },
        },
    },

    "/favorites/my-favorites": {
        get: {
            tags: ["Favorites & Wishlist"],
            summary: "Get current user's saved favorites",
            description: "Retrieves a paginated list of all properties and venues saved by the authenticated user.",
            security: [{ bearerAuth: [] }],
            parameters: [
                { name: "page", in: "query", schema: { type: "integer", default: 1 } },
                { name: "limit", in: "query", schema: { type: "integer", default: 12 } },
            ],
            responses: {
                200: {
                    description: "Favorites retrieved successfully",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    statusCode: { type: "number", example: 200 },
                                    success: { type: "boolean", example: true },
                                    message: { type: "string", example: "Favorites retrieved successfully." },
                                    meta: { $ref: "#/components/schemas/PaginationMeta" },
                                    data: {
                                        type: "array",
                                        items: { $ref: "#/components/schemas/FavoriteItem" },
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

    "/favorites/check/{listingId}": {
        get: {
            tags: ["Favorites & Wishlist"],
            summary: "Check if listing is favorited by current user",
            description: "Fast boolean check to render the heart/save button in the frontend.",
            security: [{ bearerAuth: [] }],
            parameters: [
                { name: "listingId", in: "path", required: true, schema: { type: "string" } },
            ],
            responses: {
                200: {
                    description: "Check completed",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    statusCode: { type: "number", example: 200 },
                                    success: { type: "boolean", example: true },
                                    message: { type: "string", example: "Listing is in favorites." },
                                    data: {
                                        type: "object",
                                        properties: {
                                            isFavorite: { type: "boolean", example: true },
                                        },
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

    "/favorites/{listingId}/note": {
        patch: {
            tags: ["Favorites & Wishlist"],
            summary: "Update private note on saved listing",
            description: "Updates or adds a personal reminder or note to a favorited property.",
            security: [{ bearerAuth: [] }],
            parameters: [
                { name: "listingId", in: "path", required: true, schema: { type: "string" } },
            ],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/UpdateFavoriteNoteRequest" },
                    },
                },
            },
            responses: {
                200: {
                    description: "Note updated successfully",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    statusCode: { type: "number", example: 200 },
                                    success: { type: "boolean", example: true },
                                    message: { type: "string", example: "Favorite note updated successfully." },
                                    data: { $ref: "#/components/schemas/FavoriteItem" },
                                },
                            },
                        },
                    },
                },
                401: { $ref: "#/components/schemas/ApiErrorResponse" },
                404: { $ref: "#/components/schemas/ApiErrorResponse" },
            },
        },
    },

    "/favorites/{listingId}": {
        delete: {
            tags: ["Favorites & Wishlist"],
            summary: "Remove listing from favorites",
            description: "Explicitly removes a saved property from the user's favorites list.",
            security: [{ bearerAuth: [] }],
            parameters: [
                { name: "listingId", in: "path", required: true, schema: { type: "string" } },
            ],
            responses: {
                200: {
                    description: "Removed from favorites",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    statusCode: { type: "number", example: 200 },
                                    success: { type: "boolean", example: true },
                                    message: { type: "string", example: "Listing removed from favorites successfully." },
                                    data: {
                                        type: "object",
                                        properties: {
                                            message: { type: "string", example: "Listing removed from favorites successfully." },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                401: { $ref: "#/components/schemas/ApiErrorResponse" },
                404: { $ref: "#/components/schemas/ApiErrorResponse" },
            },
        },
    },

    "/favorites/count/{listingId}": {
        get: {
            tags: ["Favorites & Wishlist"],
            summary: "Get total bookmarks count for a listing",
            description: "Public count of how many users have saved this listing.",
            parameters: [
                { name: "listingId", in: "path", required: true, schema: { type: "string" } },
            ],
            responses: {
                200: {
                    description: "Bookmark count retrieved",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    statusCode: { type: "number", example: 200 },
                                    success: { type: "boolean", example: true },
                                    message: { type: "string", example: "Bookmark count retrieved successfully." },
                                    data: {
                                        type: "object",
                                        properties: {
                                            listingId: { type: "string", example: "6650a123f8194b321a000001" },
                                            bookmarkCount: { type: "number", example: 38 },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    },
};

