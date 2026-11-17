export const visitorPaths = {
    "/visitors/track": {
        post: {
            tags: ["Visitors"],
            summary: "Record or update visitor activity",
            description: "Public client endpoint for tracking site/app visits. Automatically captures IP address and parses User-Agent (device, browser, OS). If user is authenticated, associates visitor with user account.",
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/TrackVisitorRequest" },
                    },
                },
            },
            responses: {
                200: {
                    description: "Visitor activity recorded successfully.",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    success: { type: "boolean", example: true },
                                    message: { type: "string", example: "Visitor activity recorded successfully." },
                                    data: { $ref: "#/components/schemas/VisitorItem" },
                                },
                            },
                        },
                    },
                },
                400: { description: "Invalid visitor payload or missing visitorId." },
            },
        },
    },
    "/visitors/analytics": {
        get: {
            tags: ["Visitors"],
            summary: "Get visitor analytics and statistics (Admin only)",
            description: "Aggregates total visitors, visits, today/weekly/monthly active counts, device breakdown, top browsers, top pages, and top countries.",
            security: [{ bearerAuth: [] }],
            responses: {
                200: {
                    description: "Visitor analytics retrieved successfully.",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/VisitorAnalyticsResponse" },
                        },
                    },
                },
                401: { description: "Unauthorized. Missing or invalid Bearer token." },
                403: { description: "Forbidden. Admin access required." },
            },
        },
    },
    "/visitors": {
        get: {
            tags: ["Visitors"],
            summary: "List all visitors with pagination and filters (Admin only)",
            description: "Fetches visitors with multi-criteria filtering (search, device, browser, OS, country, city, registered vs guest, and date ranges).",
            security: [{ bearerAuth: [] }],
            parameters: [
                {
                    name: "search",
                    in: "query",
                    schema: { type: "string" },
                    description: "Search in visitorId, IP address, path, browser, OS, city, country",
                },
                {
                    name: "device",
                    in: "query",
                    schema: { type: "string", enum: ["Desktop", "Mobile", "Tablet"] },
                    description: "Filter by device type",
                },
                {
                    name: "browser",
                    in: "query",
                    schema: { type: "string" },
                    description: "Filter by browser name",
                },
                {
                    name: "os",
                    in: "query",
                    schema: { type: "string" },
                    description: "Filter by operating system",
                },
                {
                    name: "country",
                    in: "query",
                    schema: { type: "string" },
                    description: "Filter by country",
                },
                {
                    name: "city",
                    in: "query",
                    schema: { type: "string" },
                    description: "Filter by city",
                },
                {
                    name: "isUser",
                    in: "query",
                    schema: { type: "boolean" },
                    description: "True for registered users, false for guests",
                },
                {
                    name: "startDate",
                    in: "query",
                    schema: { type: "string", format: "date" },
                    description: "Filter visits on or after this date (YYYY-MM-DD)",
                },
                {
                    name: "endDate",
                    in: "query",
                    schema: { type: "string", format: "date" },
                    description: "Filter visits on or before this date (YYYY-MM-DD)",
                },
                {
                    name: "page",
                    in: "query",
                    schema: { type: "integer", default: 1 },
                },
                {
                    name: "limit",
                    in: "query",
                    schema: { type: "integer", default: 10 },
                },
                {
                    name: "sortBy",
                    in: "query",
                    schema: { type: "string", default: "lastVisit" },
                },
                {
                    name: "sortOrder",
                    in: "query",
                    schema: { type: "string", enum: ["asc", "desc"], default: "desc" },
                },
            ],
            responses: {
                200: {
                    description: "Visitors retrieved successfully.",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/VisitorListResponse" },
                        },
                    },
                },
                401: { description: "Unauthorized." },
                403: { description: "Forbidden. Admin access required." },
            },
        },
    },
    "/visitors/{id}": {
        get: {
            tags: ["Visitors"],
            summary: "Get single visitor details by ID (Admin only)",
            description: "Retrieves complete visitor profile and visit history by MongoDB _id or visitorId.",
            security: [{ bearerAuth: [] }],
            parameters: [
                {
                    name: "id",
                    in: "path",
                    required: true,
                    schema: { type: "string" },
                    description: "Visitor MongoDB _id or visitorId",
                },
            ],
            responses: {
                200: {
                    description: "Visitor details retrieved successfully.",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    success: { type: "boolean", example: true },
                                    message: { type: "string", example: "Visitor details retrieved successfully." },
                                    data: { $ref: "#/components/schemas/VisitorItem" },
                                },
                            },
                        },
                    },
                },
                401: { description: "Unauthorized." },
                403: { description: "Forbidden. Admin access required." },
                404: { description: "Visitor record not found." },
            },
        },
        delete: {
            tags: ["Visitors"],
            summary: "Delete visitor record by ID (Admin only)",
            security: [{ bearerAuth: [] }],
            parameters: [
                {
                    name: "id",
                    in: "path",
                    required: true,
                    schema: { type: "string" },
                },
            ],
            responses: {
                200: {
                    description: "Visitor record deleted successfully.",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    success: { type: "boolean", example: true },
                                    message: { type: "string", example: "Visitor record deleted successfully." },
                                    data: { type: "null", example: null },
                                },
                            },
                        },
                    },
                },
                401: { description: "Unauthorized." },
                403: { description: "Forbidden. Admin access required." },
                404: { description: "Visitor record not found." },
            },
        },
    },
};
