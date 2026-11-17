import { Router } from "express";
import { visitorControllers } from "./visitor.controllers";
import { visitorValidations } from "./visitor.validation";
import validateRequest from "../../middlewares/validateRequest";
import auth from "../../middlewares/auth";
import authorize from "../../middlewares/authorized";
import checkAuth from "../../middlewares/checkAuth";

const router = Router();

// Public / client route: track visitor activity (links to user if logged in via checkAuth)
router.post("/track", checkAuth, validateRequest(visitorValidations.trackVisitorZodSchema), visitorControllers.trackVisitor);

// Admin-only protected routes
router.get("/analytics", auth, authorize(["ADMIN"]), visitorControllers.getVisitorAnalytics);
router.get("/", auth, authorize(["ADMIN"]), visitorControllers.getAllVisitors);
router.get("/:id", auth, authorize(["ADMIN"]), visitorControllers.getVisitorById);
router.delete("/:id", auth, authorize(["ADMIN"]), visitorControllers.deleteVisitor);

export const visitorRoutes = router;
