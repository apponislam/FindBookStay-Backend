import { Router } from "express";
import { settingsControllers } from "./settings.controllers";
import { settingsValidations } from "./settings.validation";
import auth from "../../middlewares/auth";
import authorize from "../../middlewares/authorized";
import validateRequest from "../../middlewares/validateRequest";

const router = Router();

// Get current user's settings
router.get("/", auth, settingsControllers.getMySettings);

// Update current user's settings
router.patch("/", auth, validateRequest(settingsValidations.updateSettingsZodSchema), settingsControllers.updateMySettings);

// Reset current user's settings to default
router.post("/reset", auth, settingsControllers.resetMySettings);

// Admin: View settings of a specific user
router.get("/user/:userId", auth, authorize(["ADMIN"]), settingsControllers.getUserSettings);

export const settingsRoutes = router;
