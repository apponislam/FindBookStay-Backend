import { Router } from "express";
import auth from "../../middlewares/auth";
import authorize from "../../middlewares/authorized";
import { activityLogControllers } from "./activityLog.controllers";

const router = Router();

// Admin only routes
router.get("/", auth, authorize(["ADMIN"]), activityLogControllers.getAllLogs);
router.delete("/purge", auth, authorize(["ADMIN"]), activityLogControllers.deleteOldLogs);
router.get("/:id", auth, authorize(["ADMIN"]), activityLogControllers.getLogById);
router.delete("/:id", auth, authorize(["ADMIN"]), activityLogControllers.deleteLogById);

export const activityLogRoutes = router;

