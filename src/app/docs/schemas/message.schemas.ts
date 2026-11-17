export const messageSchemas = {
    SendMessageRequest: {
        type: "object",
        properties: {
            conversationId: {
                type: "string",
                example: "6660d123f8194b321a000005",
                description: "Optional conversation ID. If omitted, recipientId must be provided.",
            },
            recipientId: {
                type: "string",
                example: "6640c432d4310e543a000002",
                description: "Optional recipient user ID. Required if conversationId is not provided.",
            },
            listingId: {
                type: "string",
                example: "6650d123f8194b321a000004",
                description: "Optional listing ID to link conversation with",
            },
            clientMessageId: {
                type: "string",
                example: "cuid-or-uuid-v4-abc",
                description: "Optional client-generated unique ID for optimistic UI and idempotent delivery",
            },
            messageType: {
                type: "string",
                enum: ["TEXT", "IMAGE"],
                default: "TEXT",
            },
            text: {
                type: "string",
                example: "Hello, when can I come visit the property?",
            },
            attachments: {
                type: "array",
                items: { type: "string" },
                example: ["/uploads/messages/messages-1731718800000-1.webp"],
                description: "Uploaded image URLs (also supports multipart form-data upload)",
            },
        },
    },
    MessageItem: {
        type: "object",
        properties: {
            _id: { type: "string", example: "6670d123f8194b321a000006" },
            conversation: { type: "string", example: "6660d123f8194b321a000005" },
            sender: {
                type: "object",
                properties: {
                    _id: { type: "string", example: "6640c432d4310e543a000001" },
                    name: { type: "string", example: "Appon Islam" },
                    email: { type: "string", example: "appon@example.com" },
                    role: { type: "string", example: "USER" },
                    profileImage: { type: "string", example: "/uploads/profile/profile-1.webp" },
                },
            },
            recipient: {
                type: "object",
                properties: {
                    _id: { type: "string", example: "6640c432d4310e543a000002" },
                    name: { type: "string", example: "Sarah Jenkins" },
                    email: { type: "string", example: "sarah@example.com" },
                    role: { type: "string", example: "USER" },
                    profileImage: { type: "string", example: "/uploads/profile/profile-2.webp" },
                },
            },
            clientMessageId: { type: "string", example: "cuid-or-uuid-v4-abc", nullable: true },
            messageType: {
                type: "string",
                enum: ["TEXT", "IMAGE"],
                example: "TEXT",
            },
            text: { type: "string", example: "Hello! Is this stay available for this weekend?" },
            attachments: {
                type: "array",
                items: { type: "string" },
                example: [],
            },
            isRead: { type: "boolean", example: false },
            readAt: { type: "string", format: "date-time", nullable: true },
            status: { type: "string", enum: ["SENT", "DELIVERED", "READ"], example: "SENT" },
            isDeleted: { type: "boolean", example: false },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
        },
    },
    MessageListResponse: {
        type: "object",
        properties: {
            success: { type: "boolean", example: true },
            message: { type: "string", example: "Messages retrieved successfully." },
            meta: {
                type: "object",
                properties: {
                    limit: { type: "number", example: 50 },
                    nextCursor: { type: "string", nullable: true, example: "6670d123f8194b321a000006" },
                    hasMore: { type: "boolean", example: true },
                    isCursorMode: { type: "boolean", example: true },
                    page: { type: "number", example: 1 },
                    total: { type: "number", example: 35 },
                    totalPages: { type: "number", example: 1 },
                    hasNext: { type: "boolean", example: false },
                    hasPrev: { type: "boolean", example: false },
                },
            },
            data: {
                type: "array",
                items: { $ref: "#/components/schemas/MessageItem" },
            },
        },
    },
    SyncMessagesResponse: {
        type: "object",
        properties: {
            success: { type: "boolean", example: true },
            message: { type: "string", example: "Messages synced successfully." },
            meta: {
                type: "object",
                properties: {
                    count: { type: "number", example: 4 },
                    syncedAt: { type: "string", format: "date-time" },
                },
            },
            data: {
                type: "array",
                items: { $ref: "#/components/schemas/MessageItem" },
            },
        },
    },
};
