export const notificationPaths = {
    "/notifications": {
        get: {
            tags: ["In-App Notifications"],
            summary: "Get notifications for current user",
            description: "Retrieves paginated notifications for the logged-in user, sorted newest first, including the total unread badge count.",
            security: [{ bearerAuth: [] }],
            parameters: [
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
                {
                    name: "isRead",
                    in: "query",
                    schema: { type: "boolean" },
                    description: "Filter by read/unread status",
                },
                {
                    name: "type",
                    in: "query",
                    schema: { type: "string" },
                    description: "Filter by notification category type",
                },
            ],
            responses: {
                200: {
                    description: "Notifications retrieved successfully.",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/NotificationListResponse" },
                        },
                    },
                },
                401: { description: "Unauthorized." },
            },
        },
    },
    "/notifications/unread-count": {
        get: {
            tags: ["In-App Notifications"],
            summary: "Get unread notifications count",
            description: "Ultra-fast count query for the unread badge in navigation bars and mobile tab bars.",
            security: [{ bearerAuth: [] }],
            responses: {
                200: {
                    description: "Unread count retrieved successfully.",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/UnreadCountResponse" },
                        },
                    },
                },
                401: { description: "Unauthorized." },
            },
        },
    },
    "/notifications/read-all": {
        patch: {
            tags: ["In-App Notifications"],
            summary: "Mark all notifications as read",
            description: "Updates all unread notifications of the current user to read status and emits real-time Socket.IO notification_read events.",
            security: [{ bearerAuth: [] }],
            responses: {
                200: { description: "All notifications marked as read successfully." },
                401: { description: "Unauthorized." },
            },
        },
    },
    "/notifications/{id}/read": {
        patch: {
            tags: ["In-App Notifications"],
            summary: "Mark a single notification as read",
            description: "Marks a specific notification as read and emits real-time read events.",
            security: [{ bearerAuth: [] }],
            parameters: [
                {
                    name: "id",
                    in: "path",
                    required: true,
                    schema: { type: "string" },
                    description: "Notification ObjectId",
                },
            ],
            responses: {
                200: { description: "Notification marked as read successfully." },
                401: { description: "Unauthorized." },
                404: { description: "Notification not found." },
            },
        },
    },
    "/notifications/clear-all": {
        delete: {
            tags: ["In-App Notifications"],
            summary: "Clear all notifications",
            description: "Clears/deletes all notifications from current user's inbox.",
            security: [{ bearerAuth: [] }],
            responses: {
                200: { description: "All notifications cleared successfully." },
                401: { description: "Unauthorized." },
            },
        },
    },
    "/notifications/{id}": {
        delete: {
            tags: ["In-App Notifications"],
            summary: "Delete a single notification",
            description: "Soft deletes a specific notification for the current user.",
            security: [{ bearerAuth: [] }],
            parameters: [
                {
                    name: "id",
                    in: "path",
                    required: true,
                    schema: { type: "string" },
                    description: "Notification ObjectId",
                },
            ],
            responses: {
                200: { description: "Notification deleted successfully." },
                401: { description: "Unauthorized." },
                404: { description: "Notification not found." },
            },
        },
    },
    "/notifications/send": {
        post: {
            tags: ["In-App Notifications (Admin Only)"],
            summary: "Send or broadcast a notification",
            description: "Admin endpoint to send an in-app notification to an individual user or broadcast to all/role-targeted users with real-time Socket.IO delivery.",
            security: [{ bearerAuth: [] }],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/SendNotificationRequest" },
                    },
                },
            },
            responses: {
                201: { description: "Notification dispatched successfully." },
                401: { description: "Unauthorized." },
                403: { description: "Forbidden. Admin access required." },
            },
        },
    },
};

