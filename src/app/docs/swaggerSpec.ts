import { commonSchemas } from "./schemas/common.schemas";
import { authSchemas } from "./schemas/auth.schemas";
import { addressSchemas } from "./schemas/address.schemas";
import { policySchemas } from "./schemas/policy.schemas";
import { activityLogSchemas } from "./schemas/activityLog.schemas";
import { listingSchemas } from "./schemas/listing.schemas";

import { authPaths } from "./paths/auth.paths";
import { addressPaths } from "./paths/address.paths";
import { policyPaths } from "./paths/policy.paths";
import { activityLogPaths } from "./paths/activityLog.paths";
import { listingPaths } from "./paths/listing.paths";

export const swaggerSpec = {
    openapi: "3.0.3",
    info: {
        title: "FindBookStay API Documentation",
        version: "1.0.0",
        description: "Production REST API for **FindBookStay** — The verified marketplace for home rentals, boutique hotel stays, sports turfs, and direct property purchases with 0% broker fees.\n\n" + "### Authentication\n" + "Protected routes require a valid JWT Bearer token. Click the **Authorize** button on the right and input: `Bearer <your_access_token>`.",
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
        },
    },
    paths: {
        ...authPaths,
        ...listingPaths,
        ...addressPaths,
        ...policyPaths,
        ...activityLogPaths,
    },
};
