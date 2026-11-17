export const conversationSchemas = {
    CreateConversationRequest: {
        type: "object",
        required: ["recipientId"],
        properties: {
            recipientId: {
                type: "string",
                example: "6640c432d4310e543a000001",
                description: "24-character hexadecimal ObjectId of the recipient user",
            },
            listingId: {
                type: "string",
                example: "6650d123f8194b321a000004",
                description: "Optional listing ObjectId this conversation discusses",
            },
            initialMessage: {
                type: "string",
                example: "Hello! Is this stay available for this weekend?",
                description: "Optional initial message text to send immediately",
            },
        },
    },
    ConversationItem: {
        type: "object",
        properties: {
            _id: { type: "string", example: "6660d123f8194b321a000005" },
            participants: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        _id: { type: "string", example: "6640c432d4310e543a000001" },
                        name: { type: "string", example: "Sarah Jenkins" },
                        email: { type: "string", example: "sarah@example.com" },
                        role: { type: "string", example: "USER" },
                        profileImage: { type: "string", example: "/uploads/profile/profile-1.webp" },
                        isEmailVerified: { type: "boolean", example: true },
                        phone: { type: "string", example: "+8801700000000" },
                    },
                },
            },
            listing: {
                type: "object",
                nullable: true,
                properties: {
                    _id: { type: "string", example: "6650d123f8194b321a000004" },
                    title: { type: "string", example: "Luxury 3BR Apartment in Banani" },
                    price: { type: "number", example: 45000 },
                    images: { type: "array", items: { type: "string" } },
                    listingType: { type: "string", example: "HOME" },
                    status: { type: "string", example: "APPROVED" },
                },
            },
            lastMessage: { type: "string", example: "6670d123f8194b321a000006" },
            lastMessageText: { type: "string", example: "Yes, it is available!" },
            lastMessageAt: { type: "string", format: "date-time" },
            unreadCounts: {
                type: "object",
                additionalProperties: { type: "number" },
                example: { "6640c432d4310e543a000001": 0, "6640c432d4310e543a000002": 2 },
            },
            archivedBy: {
                type: "array",
                items: { type: "string" },
            },
            isBlocked: { type: "boolean", example: false },
            blockedBy: { type: "string", nullable: true },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
        },
    },
    ConversationListResponse: {
        type: "object",
        properties: {
            success: { type: "boolean", example: true },
            message: { type: "string", example: "Conversations retrieved successfully." },
            meta: {
                type: "object",
                properties: {
                    page: { type: "number", example: 1 },
                    limit: { type: "number", example: 20 },
                    total: { type: "number", example: 12 },
                    totalPages: { type: "number", example: 1 },
                    hasNext: { type: "boolean", example: false },
                    hasPrev: { type: "boolean", example: false },
                },
            },
            data: {
                type: "array",
                items: { $ref: "#/components/schemas/ConversationItem" },
            },
        },
    },
};
