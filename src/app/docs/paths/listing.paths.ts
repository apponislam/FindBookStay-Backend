export const listingPaths = {
    "/listings/stats": {
        get: {
            tags: ["Listings Marketplace"],
            summary: "Marketplace statistics overview",
            description: "Returns aggregated statistics including total listings, active counts, pending approvals, vertical breakdown, and top cities.",
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
                                    message: { type: "string", example: "Listing statistics retrieved successfully." },
                                    data: {
                                        type: "object",
                                        properties: {
                                            totalListings: { type: "number", example: 120 },
                                            activeListings: { type: "number", example: 98 },
                                            pendingApprovalListings: { type: "number", example: 15 },
                                            categories: {
                                                type: "object",
                                                properties: {
                                                    HOME: { type: "object", properties: { total: { type: "number" }, active: { type: "number" } } },
                                                    STAY: { type: "object", properties: { total: { type: "number" }, active: { type: "number" } } },
                                                    TURF: { type: "object", properties: { total: { type: "number" }, active: { type: "number" } } },
                                                    PROPERTY: { type: "object", properties: { total: { type: "number" }, active: { type: "number" } } },
                                                },
                                            },
                                            topCities: {
                                                type: "array",
                                                items: {
                                                    type: "object",
                                                    properties: {
                                                        city: { type: "string", example: "Dhaka" },
                                                        count: { type: "number", example: 64 },
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
            },
        },
    },

    "/listings/featured": {
        get: {
            tags: ["Listings Marketplace"],
            summary: "Get featured curated listings",
            description: "Returns featured verified listings across all or specific verticals for homepage banners and spotlights.",
            parameters: [
                {
                    name: "category",
                    in: "query",
                    description: "Filter by vertical (HOME, STAY, TURF, PROPERTY)",
                    schema: { $ref: "#/components/schemas/ListingCategory" },
                },
                {
                    name: "limit",
                    in: "query",
                    description: "Maximum number of listings to return (default: 8)",
                    schema: { type: "integer", default: 8 },
                },
            ],
            responses: {
                200: {
                    description: "Featured listings retrieved successfully",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    statusCode: { type: "number", example: 200 },
                                    success: { type: "boolean", example: true },
                                    message: { type: "string", example: "Featured listings retrieved successfully." },
                                    data: {
                                        type: "array",
                                        items: { $ref: "#/components/schemas/ListingItem" },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    },

    "/listings": {
        get: {
            tags: ["Listings Marketplace"],
            summary: "Search & explore marketplace listings",
            description: "Browse listings with full-text search, vertical filters, price range, location, and geo-radius distance filtering.",
            parameters: [
                { name: "searchTerm", in: "query", description: "Search keyword across title, description, address, and area", schema: { type: "string" } },
                { name: "category", in: "query", description: "Marketplace vertical (HOME, STAY, TURF, PROPERTY)", schema: { $ref: "#/components/schemas/ListingCategory" } },
                { name: "subCategory", in: "query", description: "Vertical subcategory", schema: { $ref: "#/components/schemas/ListingSubCategory" } },
                { name: "city", in: "query", description: "Filter by city (e.g. Dhaka, Chittagong)", schema: { type: "string" } },
                { name: "area", in: "query", description: "Filter by neighborhood or area (e.g. Gulshan, Banani, Dhanmondi)", schema: { type: "string" } },
                { name: "minPrice", in: "query", description: "Minimum price", schema: { type: "number" } },
                { name: "maxPrice", in: "query", description: "Maximum price", schema: { type: "number" } },
                { name: "priceUnit", in: "query", description: "Price unit", schema: { $ref: "#/components/schemas/PriceUnit" } },
                { name: "lat", in: "query", description: "Geographic latitude for radius search", schema: { type: "number" } },
                { name: "lng", in: "query", description: "Geographic longitude for radius search", schema: { type: "number" } },
                { name: "radiusInKm", in: "query", description: "Radius in kilometers around [lat, lng] (default: 10km)", schema: { type: "number", default: 10 } },
                { name: "isFeatured", in: "query", schema: { type: "boolean" } },
                { name: "isVerified", in: "query", schema: { type: "boolean" } },
                { name: "page", in: "query", schema: { type: "integer", default: 1 } },
                { name: "limit", in: "query", schema: { type: "integer", default: 12 } },
                { name: "sortBy", in: "query", description: "Field to sort by (price, viewsCount, ratingAverage, createdAt)", schema: { type: "string", enum: ["price", "viewsCount", "ratingAverage", "createdAt"] } },
                { name: "sortOrder", in: "query", schema: { type: "string", enum: ["asc", "desc"], default: "desc" } },
            ],
            responses: {
                200: {
                    description: "Listings retrieved successfully",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    statusCode: { type: "number", example: 200 },
                                    success: { type: "boolean", example: true },
                                    message: { type: "string", example: "Listings retrieved successfully." },
                                    meta: { $ref: "#/components/schemas/PaginationMeta" },
                                    data: {
                                        type: "array",
                                        items: { $ref: "#/components/schemas/ListingItem" },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        post: {
            tags: ["Listings Marketplace"],
            summary: "Create new listing (Multipart or JSON)",
            description: "Publish a new listing in any of the 4 verticals. Supports multipart/form-data with binary images (automatically optimized with Sharp to modern WebP format) or JSON payloads with Base64/URLs.",
            security: [{ bearerAuth: [] }],
            requestBody: {
                required: true,
                content: {
                    "multipart/form-data": {
                        schema: { $ref: "#/components/schemas/CreateListingRequest" },
                    },
                    "application/json": {
                        schema: { $ref: "#/components/schemas/CreateListingRequest" },
                    },
                },
            },
            responses: {
                201: {
                    description: "Listing created successfully",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    statusCode: { type: "number", example: 201 },
                                    success: { type: "boolean", example: true },
                                    message: { type: "string", example: "Listing submitted successfully. It will be reviewed by our team shortly." },
                                    data: { $ref: "#/components/schemas/ListingItem" },
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

    "/listings/my-listings": {
        get: {
            tags: ["Listings Marketplace"],
            summary: "Get current user's listings",
            description: "Returns all listings created by the authenticated user, including draft and pending approval items.",
            security: [{ bearerAuth: [] }],
            parameters: [
                { name: "category", in: "query", schema: { $ref: "#/components/schemas/ListingCategory" } },
                { name: "status", in: "query", schema: { $ref: "#/components/schemas/ListingStatus" } },
                { name: "page", in: "query", schema: { type: "integer", default: 1 } },
                { name: "limit", in: "query", schema: { type: "integer", default: 10 } },
            ],
            responses: {
                200: {
                    description: "User listings retrieved successfully",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    statusCode: { type: "number", example: 200 },
                                    success: { type: "boolean", example: true },
                                    message: { type: "string", example: "My listings retrieved successfully." },
                                    meta: { $ref: "#/components/schemas/PaginationMeta" },
                                    data: {
                                        type: "array",
                                        items: { $ref: "#/components/schemas/ListingItem" },
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

    "/listings/{idOrSlug}": {
        get: {
            tags: ["Listings Marketplace"],
            summary: "Get listing details by ID or Slug",
            description: "Retrieves complete listing details and automatically increments the public view counter. Public visitors can view ACTIVE listings; owners and admins can preview pending listings.",
            parameters: [
                {
                    name: "idOrSlug",
                    in: "path",
                    required: true,
                    description: "Listing MongoDB ID (e.g. 6650a...) or friendly URL slug (e.g. modern-3-bed-flat-banani-abc123)",
                    schema: { type: "string" },
                },
            ],
            responses: {
                200: {
                    description: "Listing details retrieved successfully",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    statusCode: { type: "number", example: 200 },
                                    success: { type: "boolean", example: true },
                                    message: { type: "string", example: "Listing details retrieved successfully." },
                                    data: { $ref: "#/components/schemas/ListingItem" },
                                },
                            },
                        },
                    },
                },
                404: { $ref: "#/components/schemas/ApiErrorResponse" },
            },
        },
    },

    "/listings/{id}": {
        patch: {
            tags: ["Listings Marketplace"],
            summary: "Update listing (Owner or Admin)",
            description: "Update listing details, pricing, location, or photos. Only the owner or an admin can perform updates.",
            security: [{ bearerAuth: [] }],
            parameters: [
                { name: "id", in: "path", required: true, schema: { type: "string" } },
            ],
            requestBody: {
                content: {
                    "multipart/form-data": {
                        schema: { $ref: "#/components/schemas/CreateListingRequest" },
                    },
                    "application/json": {
                        schema: { $ref: "#/components/schemas/CreateListingRequest" },
                    },
                },
            },
            responses: {
                200: {
                    description: "Listing updated successfully",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    statusCode: { type: "number", example: 200 },
                                    success: { type: "boolean", example: true },
                                    message: { type: "string", example: "Listing updated successfully." },
                                    data: { $ref: "#/components/schemas/ListingItem" },
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
            tags: ["Listings Marketplace"],
            summary: "Soft delete listing (Owner or Admin)",
            description: "Soft deletes a listing by setting isDeleted to true.",
            security: [{ bearerAuth: [] }],
            parameters: [
                { name: "id", in: "path", required: true, schema: { type: "string" } },
            ],
            responses: {
                200: {
                    description: "Listing deleted successfully",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    statusCode: { type: "number", example: 200 },
                                    success: { type: "boolean", example: true },
                                    message: { type: "string", example: "Listing deleted successfully." },
                                    data: {
                                        type: "object",
                                        properties: {
                                            message: { type: "string", example: "Listing deleted successfully." },
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

    "/listings/{id}/availability": {
        patch: {
            tags: ["Listings Marketplace"],
            summary: "Update availability status",
            description: "Quick toggle to mark property as AVAILABLE, BOOKED, RENTED, or SOLD.",
            security: [{ bearerAuth: [] }],
            parameters: [
                { name: "id", in: "path", required: true, schema: { type: "string" } },
            ],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/UpdateAvailabilityRequest" },
                    },
                },
            },
            responses: {
                200: {
                    description: "Availability status updated",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    statusCode: { type: "number", example: 200 },
                                    success: { type: "boolean", example: true },
                                    message: { type: "string", example: "Availability status updated to BOOKED." },
                                    data: { $ref: "#/components/schemas/ListingItem" },
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

    "/listings/{id}/approve-reject": {
        patch: {
            tags: ["Listings Marketplace (Admin Only)"],
            summary: "Approve or reject listing",
            description: "Admin moderation endpoint to approve a pending listing into ACTIVE status or reject with an optional reason.",
            security: [{ bearerAuth: [] }],
            parameters: [
                { name: "id", in: "path", required: true, schema: { type: "string" } },
            ],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/ApproveOrRejectListingRequest" },
                    },
                },
            },
            responses: {
                200: {
                    description: "Listing status updated",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    statusCode: { type: "number", example: 200 },
                                    success: { type: "boolean", example: true },
                                    message: { type: "string", example: "Listing active successfully." },
                                    data: { $ref: "#/components/schemas/ListingItem" },
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

    "/listings/{id}/toggle-feature": {
        patch: {
            tags: ["Listings Marketplace (Admin Only)"],
            summary: "Toggle featured listing status",
            description: "Promote or demote listing on homepage featured carousels.",
            security: [{ bearerAuth: [] }],
            parameters: [
                { name: "id", in: "path", required: true, schema: { type: "string" } },
            ],
            responses: {
                200: {
                    description: "Featured status toggled",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    statusCode: { type: "number", example: 200 },
                                    success: { type: "boolean", example: true },
                                    message: { type: "string", example: "Listing featured status changed to true." },
                                    data: { $ref: "#/components/schemas/ListingItem" },
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

    "/listings/{id}/toggle-verify": {
        patch: {
            tags: ["Listings Marketplace (Admin Only)"],
            summary: "Toggle verified badge",
            description: "Grant or revoke the FindBookStay verified badge on a property listing.",
            security: [{ bearerAuth: [] }],
            parameters: [
                { name: "id", in: "path", required: true, schema: { type: "string" } },
            ],
            responses: {
                200: {
                    description: "Verified badge status toggled",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    statusCode: { type: "number", example: 200 },
                                    success: { type: "boolean", example: true },
                                    message: { type: "string", example: "Listing verification status changed to true." },
                                    data: { $ref: "#/components/schemas/ListingItem" },
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
