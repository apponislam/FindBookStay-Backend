import { Router } from "express";
import { siteSettingsControllers } from "./siteSettings.controllers";
import { siteSettingsValidations } from "./siteSettings.validation";
import auth from "../../middlewares/auth";
import authorize from "../../middlewares/authorized";
import validateRequest from "../../middlewares/validateRequest";
import { uploadSiteAssets } from "../../middlewares/multer";

const router = Router();

// Public: Fetch global site configuration (branding, maintenance status, app version rules, social links)
router.get("/", siteSettingsControllers.getSiteSettings);

// Admin only: Update global site configuration (supports JSON and multipart upload for logo/favicon)
router.patch(
    "/",
    auth,
    authorize(["ADMIN"]),
    uploadSiteAssets,
    validateRequest(siteSettingsValidations.updateSiteSettingsZodSchema),
    siteSettingsControllers.updateSiteSettings,
);

export const siteSettingsRoutes = router;

