import { commonSchemas } from "./schemas/common.schemas";
import { authSchemas } from "./schemas/auth.schemas";
import { addressSchemas } from "./schemas/address.schemas";
import { policySchemas } from "./schemas/policy.schemas";
import { activityLogSchemas } from "./schemas/activityLog.schemas";
import { listingSchemas } from "./schemas/listing.schemas";
import { reviewSchemas } from "./schemas/review.schemas";
import { favoriteSchemas } from "./schemas/favorite.schemas";
import { reportSchemas } from "./schemas/report.schemas";
import { visitorSchemas } from "./schemas/visitor.schemas";
import { conversationSchemas } from "./schemas/conversation.schemas";
import { messageSchemas } from "./schemas/message.schemas";
import { settingsSchemas } from "./schemas/settings.schemas";
import { siteSettingsSchemas } from "./schemas/siteSettings.schemas";
import { notificationSchemas } from "./schemas/notification.schemas";

import { authPaths } from "./paths/auth.paths";
import { listingPaths } from "./paths/listing.paths";
import { reviewPaths } from "./paths/review.paths";
import { favoritePaths } from "./paths/favorite.paths";
import { reportPaths } from "./paths/report.paths";
import { addressPaths } from "./paths/address.paths";
import { policyPaths } from "./paths/policy.paths";
import { activityLogPaths } from "./paths/activityLog.paths";
import { visitorPaths } from "./paths/visitor.paths";
import { conversationPaths } from "./paths/conversation.paths";
import { messagePaths } from "./paths/message.paths";
import { settingsPaths } from "./paths/settings.paths";
import { siteSettingsPaths } from "./paths/siteSettings.paths";
import { notificationPaths } from "./paths/notification.paths";

export const swaggerSpec = {
    openapi: "3.0.3",
    info: {
        title: "FindBookStay API Documentation",
        version: "1.0.0",
        description:
            "Production REST API for **FindBookStay** — The verified marketplace for home rentals, boutique hotel stays, sports turfs, and direct property purchases with 0% broker fees.\n\n" +
            "### Authentication\n" +
            "Protected routes require a valid JWT Bearer token. Click the **Authorize** button on the right and input: `Bearer <your_access_token>`.",
        contact: {
            name: "FindBookStay Engineering Team",
            email: "support@findbookstay.com",
            url: "https://findbookstay.com",
        },
    },
    servers: [
        {
            url: "/api/v1",
            description: "Current Host API v1 (Relative)",
        },
        {
            url: "http://localhost:5075/api/v1",
            description: "Local Development Server",
        },
    ],
    tags: [
        {
            name: "Authentication",
            description: "Registration with Sharp WebP image processing, credentials authentication, email verification & password resets",
        },
        {
            name: "User Profile",
            description: "Current user profile retrieval, multipart profile updates, and account management",
        },
        {
            name: "Listings Marketplace",
            description: "Core marketplace listings across all 4 verticals: HOME (rentals & bachelor seats), STAY (boutique hotels & resorts), TURF (hourly sports venues), and PROPERTY (buy/sell)",
        },
        {
            name: "Listings Marketplace (Admin Only)",
            description: "Admin moderation tools: listing approval, rejection, featured spotlights, and verification badges",
        },
        {
            name: "Reviews & Ratings",
            description: "Verified customer reviews, 1-to-5 star ratings, breakdown distribution, and host response replies",
        },
        {
            name: "Reviews & Ratings (Admin Only)",
            description: "Platform-wide review moderation and inspection",
        },
        {
            name: "Favorites & Wishlist",
            description: "User property bookmarks, wishlist collections, and personal notes",
        },
        {
            name: "Trust & Safety (Reports)",
            description: "User reporting against fraudulent listings or abusive users with evidence attachments",
        },
        {
            name: "Trust & Safety (Admin Only)",
            description: "Moderation review, investigation, and dispute resolution for reported listings & accounts",
        },
        {
            name: "Notifications (FCM)",
            description: "FCM device registration, token capping (max 5 active devices), and device unregistration",
        },
        {
            name: "Addresses & Locations",
            description: "Hierarchical parent-child administrative regions (Country, State, City, Area, Zone) and recursive tree navigation",
        },
        {
            name: "Policies & Legal",
            description: "Platform legal terms, privacy policies, refund terms, and community guidelines",
        },
        {
            name: "Activity & Audit Logs",
            description: "Immutable security audit logs, user login tracking, and automated log purging (Admin Only)",
        },
        {
            name: "Visitors",
            description: "Real-time visitor tracking, analytics, device breakdown, top pages, and visitor history (Admin Only for analytics & listing)",
        },
        {
            name: "Chat & Messaging (Conversations)",
            description: "1-on-1 conversations between marketplace users, property inquiry channels, and archive/block management",
        },
        {
            name: "Chat & Messaging (Messages)",
            description: "Real-time chat messaging with photo attachments, Socket.IO instant delivery, and read receipts",
        },
        {
            name: "User Settings",
            description: "User personal preferences: notification channels, privacy controls, language, currency, and theme",
        },
        {
            name: "User Settings (Admin Only)",
            description: "Admin inspection of individual user configuration",
        },
        {
            name: "Site Settings",
            description: "Public platform configuration: branding, contact info, social links, maintenance status, and app versioning",
        },
        {
            name: "Site Settings (Admin Only)",
            description: "Platform-wide administration: business rules (commission rate, advance hours), logo/favicon uploads, and maintenance mode",
        },
        {
            name: "In-App Notifications",
            description: "User in-app notifications, unread badge counts, real-time Socket.IO alerts, and read receipt toggles",
        },
        {
            name: "In-App Notifications (Admin Only)",
            description: "Admin custom notification dispatcher and role-targeted broadcast system",
        },
    ],
    components: {
        securitySchemes: {
            bearerAuth: {
                type: "http",
                scheme: "bearer",
                bearerFormat: "JWT",
                description: "Input your JWT token in the format: `Bearer <token>`",
            },
        },
        schemas: {
            ...commonSchemas,
            ...authSchemas,
            ...addressSchemas,
            ...policySchemas,
            ...activityLogSchemas,
            ...listingSchemas,
            ...reviewSchemas,
            ...favoriteSchemas,
            ...reportSchemas,
            ...visitorSchemas,
            ...conversationSchemas,
            ...messageSchemas,
            ...settingsSchemas,
            ...siteSettingsSchemas,
            ...notificationSchemas,
        },
    },
    paths: {
        ...authPaths,
        ...listingPaths,
        ...reviewPaths,
        ...favoritePaths,
        ...reportPaths,
        ...addressPaths,
        ...policyPaths,
        ...activityLogPaths,
        ...visitorPaths,
        ...conversationPaths,
        ...messagePaths,
        ...settingsPaths,
        ...siteSettingsPaths,
        ...notificationPaths,
    },
};
