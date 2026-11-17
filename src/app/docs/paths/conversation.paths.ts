export const conversationPaths = {
    "/conversations": {
        post: {
            tags: ["Chat & Messaging (Conversations)"],
            summary: "Create or retrieve existing conversation",
            description: "Finds or initializes a 1-on-1 conversation between the authenticated user and a recipient (optionally tied to a property listing). If a conversation already exists, returns it without creating duplicates.",
            security: [{ bearerAuth: [] }],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/CreateConversationRequest" },
                    },
                },
            },
            responses: {
                200: {
                    description: "Conversation retrieved or created successfully.",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    success: { type: "boolean", example: true },
                                    message: { type: "string", example: "Conversation retrieved or created successfully." },
                                    data: { $ref: "#/components/schemas/ConversationItem" },
                                },
                            },
                        },
                    },
                },
                400: { description: "Cannot start a conversation with yourself or invalid recipient ID." },
                401: { description: "Unauthorized." },
                404: { description: "Recipient or listing not found." },
            },
        },
        get: {
            tags: ["Chat & Messaging (Conversations)"],
            summary: "Get all conversations for logged-in user",
            description: "Retrieves paginated conversations for current user, sorted by latest message activity.",
            security: [{ bearerAuth: [] }],
            parameters: [
                {
                    name: "archived",
                    in: "query",
                    schema: { type: "boolean", default: false },
                    description: "Pass true to view archived conversations",
                },
                {
                    name: "page",
                    in: "query",
                    schema: { type: "integer", default: 1 },
                },
                {
                    name: "limit",
                    in: "query",
                    schema: { type: "integer", default: 20 },
                },
            ],
            responses: {
                200: {
                    description: "Conversations retrieved successfully.",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/ConversationListResponse" },
                        },
                    },
                },
                401: { description: "Unauthorized." },
            },
        },
    },
    "/conversations/{id}": {
        get: {
            tags: ["Chat & Messaging (Conversations)"],
            summary: "Get conversation details by ID",
            description: "Retrieves single conversation details. Verifies that requesting user is a participant.",
            security: [{ bearerAuth: [] }],
            parameters: [
                {
                    name: "id",
                    in: "path",
                    required: true,
                    schema: { type: "string" },
                    description: "Conversation ObjectId",
                },
            ],
            responses: {
                200: {
                    description: "Conversation details retrieved successfully.",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    success: { type: "boolean", example: true },
                                    message: { type: "string", example: "Conversation details retrieved successfully." },
                                    data: { $ref: "#/components/schemas/ConversationItem" },
                                },
                            },
                        },
                    },
                },
                401: { description: "Unauthorized." },
                403: { description: "Forbidden. Not a participant in this conversation." },
                404: { description: "Conversation not found." },
            },
        },
    },
    "/conversations/{id}/archive": {
        patch: {
            tags: ["Chat & Messaging (Conversations)"],
            summary: "Archive or unarchive a conversation",
            description: "Toggles archive state for the requesting user.",
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
                    description: "Archive state toggled successfully.",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    success: { type: "boolean", example: true },
                                    message: { type: "string", example: "Conversation archived successfully." },
                                    data: {
                                        type: "object",
                                        properties: { isArchived: { type: "boolean" } },
                                    },
                                },
                            },
                        },
                    },
                },
                401: { description: "Unauthorized." },
                403: { description: "Forbidden." },
            },
        },
    },
    "/conversations/{id}/block": {
        patch: {
            tags: ["Chat & Messaging (Conversations)"],
            summary: "Block or unblock a conversation",
            description: "Prevents messaging within this conversation. Only the blocker can unblock.",
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
                    description: "Block status toggled successfully.",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    success: { type: "boolean", example: true },
                                    message: { type: "string", example: "Conversation blocked successfully." },
                                    data: {
                                        type: "object",
                                        properties: { isBlocked: { type: "boolean" } },
                                    },
                                },
                            },
                        },
                    },
                },
                401: { description: "Unauthorized." },
                403: { description: "Forbidden." },
            },
        },
    },
};
