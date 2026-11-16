export const reviewSchemas = {
    ReviewItem: {
        type: "object",
        properties: {
            _id: { type: "string", example: "6650b234f8194b321a000002" },
            user: {
                type: "object",
                properties: {
                    _id: { type: "string", example: "6640c432d4310e543a000001" },
                    name: { type: "string", example: "Sarah Jenkins" },
                    profileImage: { type: "string", example: "/uploads/profile/profile-user.webp" },
                },
            },
            listing: {
                type: "string",
                example: "6650a123f8194b321a000001",
                description: "Referenced listing ID",
            },
            rating: { type: "number", example: 5, minimum: 1, maximum: 5 },
            comment: {
                type: "string",
                example: "Fantastic apartment! Super clean, great natural light, and the host was very accommodating.",
            },
            images: {
                type: "array",
                items: { type: "string" },
                example: ["/uploads/reviews/review-photo-1.webp"],
            },
            subRatings: {
                type: "object",
                properties: {
                    cleanliness: { type: "number", example: 5 },
                    accuracy: { type: "number", example: 5 },
                    communication: { type: "number", example: 5 },
                    location: { type: "number", example: 4 },
                    value: { type: "number", example: 5 },
                },
            },
            reply: {
                type: "object",
                properties: {
                    comment: { type: "string", example: "Thank you for staying with us Sarah, welcome back anytime!" },
                    repliedAt: { type: "string", format: "date-time" },
                    repliedBy: {
                        type: "object",
                        properties: {
                            _id: { type: "string", example: "6640c432d4310e543a000002" },
                            name: { type: "string", example: "Host Appon" },
                            profileImage: { type: "string", example: "/uploads/profile/host.webp" },
                        },
                    },
                },
            },
            isEdited: { type: "boolean", example: false },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
        },
    },
    CreateReviewRequest: {
        type: "object",
        required: ["listing", "rating", "comment"],
        properties: {
            listing: {
                type: "string",
                example: "6650a123f8194b321a000001",
                description: "Listing MongoDB ID",
            },
            rating: {
                type: "number",
                minimum: 1,
                maximum: 5,
                example: 5,
                description: "Overall star rating (1 to 5)",
            },
            comment: {
                type: "string",
                minLength: 3,
                maxLength: 1000,
                example: "Exceptional experience! The facilities and location exceeded all our expectations.",
            },
            images: {
                type: "array",
                items: { type: "string" },
                example: [],
                description: "Optional photo URLs of your stay / experience",
            },
            subRatings: {
                type: "object",
                properties: {
                    cleanliness: { type: "number", minimum: 1, maximum: 5, example: 5 },
                    accuracy: { type: "number", minimum: 1, maximum: 5, example: 5 },
                    communication: { type: "number", minimum: 1, maximum: 5, example: 5 },
                    location: { type: "number", minimum: 1, maximum: 5, example: 4 },
                    value: { type: "number", minimum: 1, maximum: 5, example: 5 },
                },
            },
        },
    },
    UpdateReviewRequest: {
        type: "object",
        properties: {
            rating: { type: "number", minimum: 1, maximum: 5, example: 4 },
            comment: { type: "string", minLength: 3, maxLength: 1000, example: "Updated review after extended stay." },
            images: { type: "array", items: { type: "string" } },
        },
    },
    ReplyReviewRequest: {
        type: "object",
        required: ["comment"],
        properties: {
            comment: {
                type: "string",
                minLength: 2,
                maxLength: 1000,
                example: "Thank you for the wonderful feedback! Looking forward to hosting you again.",
            },
        },
    },
};

