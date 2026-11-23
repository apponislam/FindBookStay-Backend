import { Router } from "express";
import auth from "../../middlewares/auth";
import checkAuth from "../../middlewares/checkAuth";
import authorize from "../../middlewares/authorized";
import validateRequest from "../../middlewares/validateRequest";
import { uploadListingImages } from "../../middlewares/multer";
import { turfControllers } from "./turf.controllers";
import { turfValidations } from "./turf.validation";

const router = Router();

// Public turf routes
router.get("/stats", turfControllers.getTurfStats);
router.get("/featured", turfControllers.getFeaturedTurfs);
router.get("/", checkAuth, turfControllers.getAllTurfs);

// User turf listings
router.get("/my-turfs", auth, authorize(["USER", "ADMIN"]), turfControllers.getMyTurfs);

// Single turf listing
router.get("/:idOrSlug", checkAuth, turfControllers.getTurfByIdOrSlug);

// Turf mutations
router.post("/", auth, authorize(["USER", "ADMIN"]), uploadListingImages, validateRequest(turfValidations.createTurfZodSchema), turfControllers.createTurf);
router.patch("/:id", auth, authorize(["USER", "ADMIN"]), uploadListingImages, validateRequest(turfValidations.updateTurfZodSchema), turfControllers.updateTurf);
router.patch("/:id/availability", auth, authorize(["USER", "ADMIN"]), validateRequest(turfValidations.updateAvailabilityStatusZodSchema), turfControllers.updateAvailabilityStatus);
router.delete("/:id", auth, authorize(["USER", "ADMIN"]), turfControllers.deleteTurf);

// Admin moderation
router.patch("/:id/approve-reject", auth, authorize(["ADMIN"]), validateRequest(turfValidations.approveOrRejectTurfZodSchema), turfControllers.approveOrRejectTurf);
router.patch("/:id/toggle-feature", auth, authorize(["ADMIN"]), turfControllers.toggleFeatureStatus);
router.patch("/:id/toggle-verify", auth, authorize(["ADMIN"]), turfControllers.toggleVerification);

export const turfRoutes = router;

