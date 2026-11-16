export const addressPaths = {
    "/addresses/tree": {
        get: {
            tags: ["Addresses & Locations"],
            summary: "Get nested hierarchical address tree",
            description: "Returns recursive nested tree starting from root Countries down through States, Cities, Areas, and Zones. Ideal for cascading location dropdowns and filter trees.",
            responses: {
                200: {
                    description: "Hierarchical address tree.",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    success: { type: "boolean", example: true },
                                    message: { type: "string", example: "Address tree fetched successfully." },
                                    data: {
                                        type: "array",
                                        items: { $ref: "#/components/schemas/AddressTreeNode" },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    },
    "/addresses/children/{parentId}": {
        get: {
            tags: ["Addresses & Locations"],
            summary: "Get immediate child addresses of a parent",
            description: "Fetches direct child administrative units. Pass 'root' as parentId to fetch all top-level Countries.",
            parameters: [
                {
                    name: "parentId",
                    in: "path",
                    required: true,
                    schema: { type: "string" },
                    example: "root",
                    description: "Parent address ObjectId or 'root' for all Countries",
                },
            ],
            responses: {
                200: {
                    description: "Child addresses list.",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    success: { type: "boolean", example: true },
                                    data: {
                                        type: "array",
                                        items: { $ref: "#/components/schemas/AddressItem" },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    },
    "/addresses/{id}/parents": {
        get: {
            tags: ["Addresses & Locations"],
            summary: "Get parent breadcrumb lineage for an address",
            description: "Traverses upstream ancestry recursively to return breadcrumb lineage up to the root Country.",
            parameters: [
                {
                    name: "id",
                    in: "path",
                    required: true,
                    schema: { type: "string" },
                    example: "673752e50ad7df43fbe02951",
                },
            ],
            responses: {
                200: {
                    description: "Address breadcrumb lineage.",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    success: { type: "boolean", example: true },
                                    data: { $ref: "#/components/schemas/AddressParentsLineage" },
                                },
                            },
                        },
                    },
                },
                404: { description: "Address not found." },
            },
        },
    },
    "/addresses": {
        get: {
            tags: ["Addresses & Locations"],
            summary: "Get all addresses with optional filters",
            parameters: [
                { name: "addressType", in: "query", schema: { $ref: "#/components/schemas/AddressType" } },
                { name: "upperLevelAddress", in: "query", schema: { type: "string" } },
                { name: "search", in: "query", schema: { type: "string" } },
            ],
            responses: {
                200: {
                    description: "List of addresses.",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    success: { type: "boolean", example: true },
                                    data: {
                                        type: "array",
                                        items: { $ref: "#/components/schemas/AddressItem" },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        post: {
            tags: ["Addresses & Locations"],
            summary: "Create a new address location (Admin Only)",
            security: [{ bearerAuth: [] }],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/CreateAddressRequest" },
                    },
                },
            },
            responses: {
                201: {
                    description: "Address created successfully.",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    success: { type: "boolean", example: true },
                                    message: { type: "string", example: "Address created successfully." },
                                    data: { $ref: "#/components/schemas/AddressItem" },
                                },
                            },
                        },
                    },
                },
                400: { description: "Validation error or invalid parent reference." },
                403: { description: "Forbidden. Admin role required." },
            },
        },
    },
    "/addresses/{id}": {
        get: {
            tags: ["Addresses & Locations"],
            summary: "Get single address by ID",
            parameters: [
                { name: "id", in: "path", required: true, schema: { type: "string" } },
            ],
            responses: {
                200: {
                    description: "Address details.",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    success: { type: "boolean", example: true },
                                    data: { $ref: "#/components/schemas/AddressItem" },
                                },
                            },
                        },
                    },
                },
                404: { description: "Address not found." },
            },
        },
        patch: {
            tags: ["Addresses & Locations"],
            summary: "Update address location (Admin Only)",
            security: [{ bearerAuth: [] }],
            parameters: [
                { name: "id", in: "path", required: true, schema: { type: "string" } },
            ],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/UpdateAddressRequest" },
                    },
                },
            },
            responses: {
                200: { description: "Address updated successfully." },
                403: { description: "Forbidden. Admin role required." },
                404: { description: "Address not found." },
            },
        },
        delete: {
            tags: ["Addresses & Locations"],
            summary: "Delete address location (Admin Only)",
            security: [{ bearerAuth: [] }],
            parameters: [
                { name: "id", in: "path", required: true, schema: { type: "string" } },
            ],
            responses: {
                200: { description: "Address deleted successfully." },
                403: { description: "Forbidden. Admin role required." },
                404: { description: "Address not found." },
            },
        },
    },
};

