export const reportSchemas = {
    ReportTargetType: {
        type: "string",
        enum: ["LISTING", "USER"],
        example: "LISTING",
    },
    ReportReason: {
        type: "string",
        enum: [
            "FRAUD_OR_SCAM",
            "INACCURATE_INFORMATION",
            "FAKE_OR_MISLEADING_PHOTOS",
            "ALREADY_RENTED_OR_SOLD",
            "DUPLICATE_LISTING",
            "OFFENSIVE_CONTENT",
            "SCAMMER_OR_FRAUD",
            "HARASSMENT_OR_ABUSE",
            "IMPERSONATION",
            "SPAM",
            "NO_SHOW",
            "OTHER",
        ],
        example: "FRAUD_OR_SCAM",
    },
    ReportStatus: {
        type: "string",
        enum: ["PENDING", "UNDER_REVIEW", "RESOLVED", "DISMISSED"],
        example: "PENDING",
    },
    ReportPriority: {
        type: "string",
        enum: ["LOW", "MEDIUM", "HIGH"],
        example: "HIGH",
    },
    ReportItem: {
        type: "object",
        properties: {
            _id: { type: "string", example: "6650d123f8194b321a000004" },
            reporter: {
                type: "object",
                properties: {
                    _id: { type: "string", example: "6640c432d4310e543a000001" },
                    name: { type: "string", example: "Sarah Jenkins" },
                    email: { type: "string", example: "sarah@example.com" },
                    phone: { type: "string", example: "+8801700000000" },
                    profileImage: { type: "string", example: "/uploads/profile/profile-1.webp" },
                },
            },
            targetType: { $ref: "#/components/schemas/ReportTargetType" },
            reportedListing: {
                type: "object",
                properties: {
                    _id: { type: "string", example: "6650a123f8194b321a000001" },
                    title: { type: "string", example: "3-Bed Apartment in Banani" },
                    slug: { type: "string", example: "3-bed-apartment-in-banani-abc123" },
                    price: { type: "number", example: 45000 },
                    status: { type: "string", example: "ACTIVE" },
                },
            },
            reportedUser: {
                type: "object",
                properties: {
                    _id: { type: "string", example: "6640c432d4310e543a000002" },
                    name: { type: "string", example: "Reported Host" },
                    email: { type: "string", example: "host@example.com" },
                    isActive: { type: "boolean", example: true },
                },
            },
            reason: { $ref: "#/components/schemas/ReportReason" },
            description: {
                type: "string",
                example: "The property photos are completely fake and the owner demanded payment outside platform.",
            },
            evidenceImages: {
                type: "array",
                items: { type: "string" },
                example: ["/uploads/evidence/screenshot-1.webp"],
            },
            status: { $ref: "#/components/schemas/ReportStatus" },
            priority: { $ref: "#/components/schemas/ReportPriority" },
            adminNotes: { type: "string", example: "Verified listing owner claims and warned user." },
            actionTaken: { type: "string", example: "Listing unverified and removed." },
            resolvedBy: {
                type: "object",
                properties: {
                    _id: { type: "string", example: "6640c432d4310e543a000099" },
                    name: { type: "string", example: "Admin Moderator" },
                },
            },
            resolvedAt: { type: "string", format: "date-time" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
        },
    },
    CreateReportRequest: {
        type: "object",
        required: ["targetType", "reason", "description"],
        properties: {
            targetType: { $ref: "#/components/schemas/ReportTargetType" },
            reportedListing: {
                type: "string",
                example: "6650a123f8194b321a000001",
                description: "Required when targetType is LISTING",
            },
            reportedUser: {
                type: "string",
                example: "6640c432d4310e543a000002",
                description: "Required when targetType is USER",
            },
            reason: { $ref: "#/components/schemas/ReportReason" },
            description: {
                type: "string",
                minLength: 10,
                maxLength: 2000,
                example: "This listing has completely false photos and incorrect pricing info.",
            },
            evidenceImages: {
                type: "array",
                items: { type: "string" },
                example: [],
            },
        },
    },
    UpdateReportStatusRequest: {
        type: "object",
        required: ["status"],
        properties: {
            status: {
                type: "string",
                enum: ["UNDER_REVIEW", "RESOLVED", "DISMISSED"],
                example: "RESOLVED",
            },
            priority: { $ref: "#/components/schemas/ReportPriority" },
            adminNotes: { type: "string", example: "Contacted both parties and confirmed resolution." },
            actionTaken: { type: "string", example: "Listing deactivated and user issued warning." },
        },
    },
};

