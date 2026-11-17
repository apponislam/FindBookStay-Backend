import express from "express";
import { authRoutes } from "../modules/auth/auth.routes";
import { listingRoutes } from "../modules/listing/listing.routes";
import { reviewRoutes } from "../modules/review/review.routes";
import { favoriteRoutes } from "../modules/favorite/favorite.routes";
import { reportRoutes } from "../modules/report/report.routes";
import { activityLogRoutes } from "../modules/activityLog/activityLog.routes";
import { addressRoutes } from "../modules/address/address.routes";
import { policyRoutes } from "../modules/policy/policy.routes";
import { visitorRoutes } from "../modules/visitor/visitor.routes";
import { swaggerRouter } from "../docs/swagger";

const router = express.Router();

const moduleRoutes = [
    {
        path: "/auth",
        route: authRoutes,
    },
    {
        path: "/listings",
        route: listingRoutes,
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
        path: "/policies",
        route: policyRoutes,
    },
    {
        path: "/visitors",
        route: visitorRoutes,
    },
    {
        path: "/docs",
        route: swaggerRouter,
    },
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
