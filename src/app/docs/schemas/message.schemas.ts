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
            messageType: {
                type: "string",
                enum: ["TEXT", "IMAGE", "FILE", "LOCATION"],
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
                description: "Uploaded image or file URLs (also supports multipart form-data upload)",
            },
            location: {
                type: "object",
                properties: {
                    latitude: { type: "number", example: 23.8103 },
                    longitude: { type: "number", example: 90.4125 },
                    addressName: { type: "string", example: "Banani Road 11, Dhaka" },
                },
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
            messageType: {
                type: "string",
                enum: ["TEXT", "IMAGE", "FILE", "LOCATION"],
                example: "TEXT",
            },
            text: { type: "string", example: "Hello! Is this stay available for this weekend?" },
            attachments: {
                type: "array",
                items: { type: "string" },
                example: [],
            },
            location: {
                type: "object",
                properties: {
                    latitude: { type: "number", example: 23.8103 },
                    longitude: { type: "number", example: 90.4125 },
                    addressName: { type: "string", example: "Banani, Dhaka" },
                },
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
                    page: { type: "number", example: 1 },
                    limit: { type: "number", example: 50 },
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
};
