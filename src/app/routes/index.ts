import express from "express";
import { authRoutes } from "../modules/auth/auth.routes";
import { userRoutes } from "../modules/user/user.routes";
import { listingRoutes } from "../modules/listing/listing.routes";
import { reviewRoutes } from "../modules/review/review.routes";
import { favoriteRoutes } from "../modules/favorite/favorite.routes";
import { reportRoutes } from "../modules/report/report.routes";
import { activityLogRoutes } from "../modules/activityLog/activityLog.routes";
import { addressRoutes } from "../modules/address/address.routes";
import { userAddressRoutes } from "../modules/userAddress/userAddress.routes";
import { policyRoutes } from "../modules/policy/policy.routes";
import { visitorRoutes } from "../modules/visitor/visitor.routes";
import { conversationRoutes } from "../modules/conversation/conversation.routes";
import { messageRoutes } from "../modules/message/message.routes";
import { settingsRoutes } from "../modules/settings/settings.routes";
import { siteSettingsRoutes } from "../modules/siteSettings/siteSettings.routes";
import { notificationRoutes } from "../modules/notification/notification.routes";
import { listingViewRoutes } from "../modules/listingView/listingView.routes";
import { lastViewedRoutes } from "../modules/lastViewed/lastViewed.routes";
import { faqRoutes } from "../modules/faq/faq.routes";
import { toletRoutes } from "../modules/tolet/tolet.routes";
import { swaggerRouter } from "../docs/swagger";

const router = express.Router();

const moduleRoutes = [
    {
        path: "/auth",
        route: authRoutes,
    },
    {
        path: "/users",
        route: userRoutes,
    },
    {
        path: "/listings",
        route: listingRoutes,
    },
    {
        path: "/listing-views",
        route: listingViewRoutes,
    },
    {
        path: "/last-viewed",
        route: lastViewedRoutes,
    },
    {
        path: "/reviews",
        route: reviewRoutes,
    },
    {
        path: "/favorites",
        route: favoriteRoutes,
    },
    {
        path: "/reports",
        route: reportRoutes,
    },
    {
        path: "/activity-logs",
        route: activityLogRoutes,
    },
    {
        path: "/addresses",
        route: addressRoutes,
    },
    {
        path: "/user-addresses",
        route: userAddressRoutes,
    },
    {
        path: "/policies",
        route: policyRoutes,
    },
    {
        path: "/visitors",
        route: visitorRoutes,
    },
    {
        path: "/conversations",
        route: conversationRoutes,
    },
    {
        path: "/messages",
        route: messageRoutes,
    },
    {
        path: "/settings",
        route: settingsRoutes,
    },
    {
        path: "/site-settings",
        route: siteSettingsRoutes,
    },
    {
        path: "/notifications",
        route: notificationRoutes,
    },
    {
        path: "/faqs",
        route: faqRoutes,
    },
    {
        path: "/tolets",
        route: toletRoutes,
    },
    {
        path: "/docs",
        route: swaggerRouter,
    },
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
