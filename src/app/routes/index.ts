import express from "express";
import { authRoutes } from "../modules/auth/auth.routes";
import { activityLogRoutes } from "../modules/activityLog/activityLog.routes";
import { addressRoutes } from "../modules/address/address.routes";
const router = express.Router();

const moduleRoutes = [
    {
        path: "/auth",
        route: authRoutes,
    },
    {
        path: "/activity-logs",
        route: activityLogRoutes,
    },
    {
        path: "/addresses",
        route: addressRoutes,
    },
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
