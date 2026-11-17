export const notificationSchemas = {
    SendNotificationRequest: {
        type: "object",
        required: ["title", "message"],
        properties: {
            recipientId: {
                type: "string",
                example: "6640c432d4310e543a000002",
                description: "Recipient user ObjectId. Required if broadcast is false.",
            },
            broadcast: {
                type: "boolean",
                example: false,
                description: "If true, broadcasts the notification to multiple users.",
            },
            targetRole: {
                type: "string",
                enum: ["ALL", "USER", "ADMIN"],
                example: "ALL",
                description: "Role filter when broadcast is true.",
            },
            type: {
                type: "string",
                enum: [
                    "BOOKING_CREATED",
                    "BOOKING_CONFIRMED",
                    "BOOKING_CANCELLED",
                    "MESSAGE_RECEIVED",
                    "PAYMENT_SUCCESS",
                    "REVIEW_RECEIVED",
                    "LISTING_APPROVED",
                    "LISTING_REJECTED",
                    "SYSTEM_ALERT",
                    "PROMOTION",
                    "GENERAL",
                ],
                example: "BOOKING_CONFIRMED",
            },
            title: { type: "string", example: "Booking Confirmed! 🎉" },
            message: { type: "string", example: "Your reservation at Banani Luxury Suite has been confirmed by the host." },
            image: { type: "string", example: "/uploads/listings/listing-1.webp" },
            link: { type: "string", example: "/bookings/6650d123f8194b321a000004" },
            data: { type: "object", example: { bookingId: "6650d123f8194b321a000004" } },
        },
    },
    NotificationItem: {
        type: "object",
        properties: {
            _id: { type: "string", example: "6680a123f8194b321a000009" },
            recipient: { type: "string", example: "6640c432d4310e543a000002" },
            sender: {
                type: "object",
                nullable: true,
                properties: {
                    _id: { type: "string", example: "6640c432d4310e543a000001" },
                    name: { type: "string", example: "FindBookStay Admin" },
                    email: { type: "string", example: "support@findbookstay.com" },
                    role: { type: "string", example: "ADMIN" },
                    profileImage: { type: "string", example: "/uploads/profile/profile-1.webp" },
                },
            },
            type: { type: "string", example: "BOOKING_CONFIRMED" },
            title: { type: "string", example: "Booking Confirmed! 🎉" },
            message: { type: "string", example: "Your reservation has been confirmed." },
            image: { type: "string", nullable: true, example: "/uploads/listings/listing-1.webp" },
            link: { type: "string", nullable: true, example: "/bookings/123" },
            data: { type: "object" },
            isRead: { type: "boolean", example: false },
            readAt: { type: "string", format: "date-time", nullable: true },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
        },
    },
    NotificationListResponse: {
        type: "object",
        properties: {
            success: { type: "boolean", example: true },
            message: { type: "string", example: "Notifications retrieved successfully." },
            meta: {
                type: "object",
                properties: {
                    page: { type: "number", example: 1 },
                    limit: { type: "number", example: 20 },
                    total: { type: "number", example: 15 },
                    totalPages: { type: "number", example: 1 },
                    unreadCount: { type: "number", example: 3 },
                    hasNext: { type: "boolean", example: false },
                    hasPrev: { type: "boolean", example: false },
                },
            },
            data: {
                type: "array",
                items: { $ref: "#/components/schemas/NotificationItem" },
            },
        },
    },
    UnreadCountResponse: {
        type: "object",
        properties: {
            success: { type: "boolean", example: true },
            message: { type: "string", example: "Unread count retrieved successfully." },
            data: {
                type: "object",
                properties: {
                    unreadCount: { type: "number", example: 4 },
                },
            },
        },
    },
};

