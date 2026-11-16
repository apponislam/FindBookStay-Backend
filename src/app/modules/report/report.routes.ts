import { Router } from "express";
import auth from "../../middlewares/auth";
import authorize from "../../middlewares/authorized";
import validateRequest from "../../middlewares/validateRequest";
import { reportControllers } from "./report.controllers";
import { reportValidations } from "./report.validation";

const router = Router();

// ==========================================
// 1. User & Reporter Routes
// ==========================================

// Submit a new report (against a listing or user)
router.post("/", auth, authorize(["USER", "ADMIN"]), validateRequest(reportValidations.createReportZodSchema), reportControllers.createReport);

// Get reports submitted by current user
router.get("/my-reports", auth, authorize(["USER", "ADMIN"]), reportControllers.getMyReports);

// ==========================================
// 2. Admin Moderation Routes
// ==========================================

// Global report statistics overview (Must be before /:id)
router.get("/admin/stats", auth, authorize(["ADMIN"]), reportControllers.getReportStats);

// Browse and filter all reports across platform
router.get("/", auth, authorize(["ADMIN"]), reportControllers.getAllReports);

// Resolve, dismiss, or review report
router.patch("/:id/resolve", auth, authorize(["ADMIN"]), validateRequest(reportValidations.updateReportStatusZodSchema), reportControllers.resolveReport);

// Get single report details (Reporter or Admin)
router.get("/:id", auth, authorize(["USER", "ADMIN"]), reportControllers.getReportById);

export const reportRoutes = router;
