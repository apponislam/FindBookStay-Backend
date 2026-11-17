export const visitorSchemas = {
    TrackVisitorRequest: {
        type: "object",
        properties: {
            visitorId: {
                type: "string",
                example: "vis_9f83a2c0-8192-4112-921b-10a9b8c7d6e5",
                description: "Optional client UUID or fingerprint. If omitted, the backend auto-generates a unique visitorId and returns it in the response and cookie.",
            },
            currentPath: {
                type: "string",
                example: "/listings/luxury-apartment-in-banani",
                description: "Current page route or URL visited",
            },
            referrer: {
                type: "string",
                example: "https://www.google.com/",
                description: "HTTP referrer or document.referrer",
            },
            country: { type: "string", example: "Bangladesh" },
            city: { type: "string", example: "Dhaka" },
            region: { type: "string", example: "Dhaka Division" },
            metadata: {
                type: "object",
                example: { screenResolution: "1920x1080", language: "en-US" },
            },
        },
    },
    VisitorSession: {
        type: "object",
        properties: {
            path: { type: "string", example: "/listings/banani-apartment" },
            referrer: { type: "string", example: "direct" },
            timestamp: { type: "string", format: "date-time" },
        },
    },
    VisitorItem: {
        type: "object",
        properties: {
            _id: { type: "string", example: "6650d123f8194b321a000004" },
            visitorId: { type: "string", example: "vis_9f83a2c0-8192-4112-921b-10a9b8c7d6e5" },
            user: {
                type: "object",
                nullable: true,
                properties: {
                    _id: { type: "string", example: "6640c432d4310e543a000001" },
                    name: { type: "string", example: "Appon Islam" },
                    email: { type: "string", example: "appon@example.com" },
                    role: { type: "string", example: "USER" },
                    profileImage: { type: "string", example: "/uploads/profile/profile-1.webp" },
                },
            },
            ipAddress: { type: "string", example: "103.145.118.2" },
            userAgent: {
                type: "string",
                example: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            },
            device: { type: "string", enum: ["Desktop", "Mobile", "Tablet", "Unknown"], example: "Desktop" },
            browser: { type: "string", example: "Chrome" },
            os: { type: "string", example: "Windows 10/11" },
            country: { type: "string", example: "Bangladesh" },
            city: { type: "string", example: "Dhaka" },
            region: { type: "string", example: "Dhaka Division" },
            currentPath: { type: "string", example: "/listings" },
            referrer: { type: "string", example: "https://www.google.com/" },
            visitCount: { type: "number", example: 5 },
            firstVisit: { type: "string", format: "date-time" },
            lastVisit: { type: "string", format: "date-time" },
            recentVisits: {
                type: "array",
                items: { $ref: "#/components/schemas/VisitorSession" },
            },
            metadata: { type: "object" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
        },
    },
    VisitorListResponse: {
        type: "object",
        properties: {
            success: { type: "boolean", example: true },
            message: { type: "string", example: "Visitors retrieved successfully." },
            meta: {
                type: "object",
                properties: {
                    page: { type: "number", example: 1 },
                    limit: { type: "number", example: 10 },
                    total: { type: "number", example: 142 },
                    totalPages: { type: "number", example: 15 },
                    hasNext: { type: "boolean", example: true },
                    hasPrev: { type: "boolean", example: false },
                },
            },
            data: {
                type: "array",
                items: { $ref: "#/components/schemas/VisitorItem" },
            },
        },
    },
    VisitorAnalyticsResponse: {
        type: "object",
        properties: {
            success: { type: "boolean", example: true },
            message: { type: "string", example: "Visitor analytics retrieved successfully." },
            data: {
                type: "object",
                properties: {
                    summary: {
                        type: "object",
                        properties: {
                            totalVisitors: { type: "number", example: 1520 },
                            totalVisits: { type: "number", example: 8430 },
                            todayVisitors: { type: "number", example: 124 },
                            thisWeekVisitors: { type: "number", example: 650 },
                            thisMonthVisitors: { type: "number", example: 1420 },
                            registeredUsers: { type: "number", example: 420 },
                            guestVisitors: { type: "number", example: 1100 },
                        },
                    },
                    deviceBreakdown: {
                        type: "object",
                        example: { Desktop: 820, Mobile: 650, Tablet: 50 },
                    },
                    browserBreakdown: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                browser: { type: "string", example: "Chrome" },
                                count: { type: "number", example: 980 },
                            },
                        },
                    },
                    topPages: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                path: { type: "string", example: "/listings" },
                                visits: { type: "number", example: 2150 },
                            },
                        },
                    },
                    topCountries: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                country: { type: "string", example: "Bangladesh" },
                                visitors: { type: "number", example: 1200 },
                            },
                        },
                    },
                },
            },
        },
    },
};
