import { Router } from "express";
import auth from "../../middlewares/auth";
import checkAuth from "../../middlewares/checkAuth";
import authorize from "../../middlewares/authorized";
import validateRequest from "../../middlewares/validateRequest";
import { uploadListingImages } from "../../middlewares/multer";
import { stayControllers } from "./stay.controllers";
import { stayValidations } from "./stay.validation";

const router = Router();

// Public stay routes
router.get("/stats", stayControllers.getStayStats);
router.get("/featured", stayControllers.getFeaturedStays);
router.get("/", checkAuth, stayControllers.getAllStays);

// User stay listings
router.get("/my-stays", auth, authorize(["USER", "ADMIN"]), stayControllers.getMyStays);

// Single stay listing
router.get("/:idOrSlug", checkAuth, stayControllers.getStayByIdOrSlug);

// Stay mutations
router.post("/", auth, authorize(["USER", "ADMIN"]), uploadListingImages, validateRequest(stayValidations.createStayZodSchema), stayControllers.createStay);
router.patch("/:id", auth, authorize(["USER", "ADMIN"]), uploadListingImages, validateRequest(stayValidations.updateStayZodSchema), stayControllers.updateStay);
router.patch("/:id/availability", auth, authorize(["USER", "ADMIN"]), validateRequest(stayValidations.updateAvailabilityStatusZodSchema), stayControllers.updateAvailabilityStatus);
router.delete("/:id", auth, authorize(["USER", "ADMIN"]), stayControllers.deleteStay);

// Admin moderation
router.patch("/:id/approve-reject", auth, authorize(["ADMIN"]), validateRequest(stayValidations.approveOrRejectStayZodSchema), stayControllers.approveOrRejectStay);
router.patch("/:id/toggle-feature", auth, authorize(["ADMIN"]), stayControllers.toggleFeatureStatus);
router.patch("/:id/toggle-verify", auth, authorize(["ADMIN"]), stayControllers.toggleVerification);

export const stayRoutes = router;
