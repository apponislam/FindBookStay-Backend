export const favoriteSchemas = {
    FavoriteItem: {
        type: "object",
        properties: {
            _id: { type: "string", example: "6650c456f8194b321a000003" },
            user: { type: "string", example: "6640c432d4310e543a000001" },
            listing: {
                type: "object",
                properties: {
                    _id: { type: "string", example: "6650a123f8194b321a000001" },
                    title: { type: "string", example: "Modern 3-Bed Luxury Apartment in Banani" },
                    slug: { type: "string", example: "modern-3-bed-luxury-apartment-in-banani-a8f3b2" },
                    featuredImage: { type: "string", example: "/uploads/listings/listings-1.webp" },
                    category: { type: "string", example: "HOME" },
                    subCategory: { type: "string", example: "FAMILY_FLAT" },
                    price: { type: "number", example: 45000 },
                    priceUnit: { type: "string", example: "PER_MONTH" },
                    currency: { type: "string", example: "BDT" },
                    ratingAverage: { type: "number", example: 4.8 },
                    totalReviews: { type: "number", example: 12 },
                    availabilityStatus: { type: "string", example: "AVAILABLE" },
                    isVerified: { type: "boolean", example: true },
                    location: {
                        type: "object",
                        properties: {
                            area: { type: "string", example: "Banani" },
                            city: { type: "string", example: "Dhaka" },
                        },
                    },
                },
            },
            note: { type: "string", example: "Shortlisted for next month move" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
        },
    },
    ToggleFavoriteRequest: {
        type: "object",
        required: ["listing"],
        properties: {
            listing: {
                type: "string",
                example: "6650a123f8194b321a000001",
                description: "Listing ID to add or remove from wishlist",
            },
            note: {
                type: "string",
                maxLength: 300,
                example: "Shortlisted for vacation stay",
                description: "Optional private note",
            },
        },
    },
    UpdateFavoriteNoteRequest: {
        type: "object",
        required: ["note"],
        properties: {
            note: {
                type: "string",
                maxLength: 300,
                example: "Bookmarked for summer holiday",
            },
        },
    },
};

