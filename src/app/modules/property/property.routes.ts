import { Router } from "express";
import auth from "../../middlewares/auth";
import checkAuth from "../../middlewares/checkAuth";
import authorize from "../../middlewares/authorized";
import validateRequest from "../../middlewares/validateRequest";
import { uploadListingImages } from "../../middlewares/multer";
import { propertyControllers } from "./property.controllers";
import { propertyValidations } from "./property.validation";

const router = Router();

// Public property routes
router.get("/stats", propertyControllers.getPropertyStats);
router.get("/featured", propertyControllers.getFeaturedProperties);
router.get("/", checkAuth, propertyControllers.getAllProperties);

// User property listings
router.get("/my-properties", auth, authorize(["USER", "ADMIN"]), propertyControllers.getMyProperties);

// Single property listing
router.get("/:idOrSlug", checkAuth, propertyControllers.getPropertyByIdOrSlug);

// Property mutations
router.post("/", auth, authorize(["USER", "ADMIN"]), uploadListingImages, validateRequest(propertyValidations.createPropertyZodSchema), propertyControllers.createProperty);
router.patch("/:id", auth, authorize(["USER", "ADMIN"]), uploadListingImages, validateRequest(propertyValidations.updatePropertyZodSchema), propertyControllers.updateProperty);
router.patch("/:id/availability", auth, authorize(["USER", "ADMIN"]), validateRequest(propertyValidations.updateAvailabilityStatusZodSchema), propertyControllers.updateAvailabilityStatus);
router.delete("/:id", auth, authorize(["USER", "ADMIN"]), propertyControllers.deleteProperty);

// Admin moderation
router.patch("/:id/approve-reject", auth, authorize(["ADMIN"]), validateRequest(propertyValidations.approveOrRejectPropertyZodSchema), propertyControllers.approveOrRejectProperty);
router.patch("/:id/toggle-feature", auth, authorize(["ADMIN"]), propertyControllers.toggleFeatureStatus);
router.patch("/:id/toggle-verify", auth, authorize(["ADMIN"]), propertyControllers.toggleVerification);

export const propertyRoutes = router;
