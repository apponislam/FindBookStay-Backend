export const messagePaths = {
    "/messages": {
        post: {
            tags: ["Chat & Messaging (Messages)"],
            summary: "Send a new message",
            description: "Sends a real-time message (text or photos). Emits instant Socket.IO events to the conversation room and recipient user room.",
            security: [{ bearerAuth: [] }],
            requestBody: {
                required: true,
                content: {
                    "multipart/form-data": {
                        schema: { $ref: "#/components/schemas/SendMessageRequest" },
                    },
                    "application/json": {
                        schema: { $ref: "#/components/schemas/SendMessageRequest" },
                    },
                },
            },
            responses: {
                201: {
                    description: "Message sent successfully.",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    success: { type: "boolean", example: true },
                                    message: { type: "string", example: "Message sent successfully." },
                                    data: { $ref: "#/components/schemas/MessageItem" },
                                },
                            },
                        },
                    },
                },
                400: { description: "Invalid payload or conversation blocked." },
                401: { description: "Unauthorized." },
                403: { description: "Forbidden. Conversation blocked or user not participant." },
            },
        },
    },
    "/messages/sync/{conversationId}": {
        get: {
            tags: ["Chat & Messaging (Messages)"],
            summary: "Sync catch-up messages on reconnect",
            description: "Fetches all messages in a conversation created or updated since a given timestamp. Ideal for mobile/web reconnection catch-up.",
            security: [{ bearerAuth: [] }],
            parameters: [
                {
                    name: "conversationId",
                    in: "path",
                    required: true,
                    schema: { type: "string" },
                    description: "Conversation ObjectId",
                },
                {
                    name: "since",
                    in: "query",
                    schema: { type: "string", format: "date-time" },
                    description: "ISO timestamp (e.g. 2026-11-17T12:00:00.000Z). Defaults to past 24 hours.",
                },
            ],
            responses: {
                200: {
                    description: "Messages synced successfully.",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/SyncMessagesResponse" },
                        },
                    },
                },
                401: { description: "Unauthorized." },
                403: { description: "Forbidden. Not a participant in this conversation." },
            },
        },
    },
    "/messages/{conversationId}": {
        get: {
            tags: ["Chat & Messaging (Messages)"],
            summary: "Get messages for a conversation",
            description: "Retrieves paginated chat history for a conversation. Supports high-performance cursor pagination (O(1)) and traditional offset pagination.",
            security: [{ bearerAuth: [] }],
            parameters: [
                {
                    name: "conversationId",
                    in: "path",
                    required: true,
                    schema: { type: "string" },
                    description: "Conversation ObjectId",
                },
                {
                    name: "cursor",
                    in: "query",
                    schema: { type: "string" },
                    description: "Optional Message _id cursor. When provided, returns messages older than this cursor (O(1) keyset seeking).",
                },
                {
                    name: "page",
                    in: "query",
                    schema: { type: "integer", default: 1 },
                    description: "Used when cursor is not provided",
                },
                {
                    name: "limit",
                    in: "query",
                    schema: { type: "integer", default: 50 },
                },
                {
                    name: "sortOrder",
                    in: "query",
                    schema: { type: "string", enum: ["asc", "desc"], default: "desc" },
                },
            ],
            responses: {
                200: {
                    description: "Messages retrieved successfully.",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/MessageListResponse" },
                        },
                    },
                },
                401: { description: "Unauthorized." },
                403: { description: "Forbidden. Not a participant in this conversation." },
            },
        },
    },
    "/messages/read/{conversationId}": {
        patch: {
            tags: ["Chat & Messaging (Messages)"],
            summary: "Mark all messages in conversation as read",
            description: "Updates all unread incoming messages in the conversation to READ status, resets unread count, and emits real-time read receipts via Socket.IO.",
            security: [{ bearerAuth: [] }],
            parameters: [
                {
                    name: "conversationId",
                    in: "path",
                    required: true,
                    schema: { type: "string" },
                },
            ],
            responses: {
                200: {
                    description: "Messages marked as read successfully.",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    success: { type: "boolean", example: true },
                                    message: { type: "string", example: "Messages marked as read successfully." },
                                    data: {
                                        type: "object",
                                        properties: {
                                            readAt: { type: "string", format: "date-time" },
                                        },
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
    "/messages/{id}": {
        delete: {
            tags: ["Chat & Messaging (Messages)"],
            summary: "Delete a message",
            description: "Deletes a message. Pass query ?forEveryone=true to unsend message (sender only).",
            security: [{ bearerAuth: [] }],
            parameters: [
                {
                    name: "id",
                    in: "path",
                    required: true,
                    schema: { type: "string" },
                    description: "Message ObjectId",
                },
                {
                    name: "forEveryone",
                    in: "query",
                    schema: { type: "boolean", default: false },
                    description: "Pass true to unsend for everyone",
                },
            ],
            responses: {
                200: {
                    description: "Message deleted successfully.",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    success: { type: "boolean", example: true },
                                    message: { type: "string", example: "Message deleted successfully." },
                                    data: { type: "null", example: null },
                                },
                            },
                        },
                    },
                },
                401: { description: "Unauthorized." },
                403: { description: "Forbidden." },
                404: { description: "Message not found." },
            },
        },
    },
};
