import { Router } from "express";
import auth from "../../middlewares/auth";
import checkAuth from "../../middlewares/checkAuth";
import authorize from "../../middlewares/authorized";
import validateRequest from "../../middlewares/validateRequest";
import { uploadListingImages } from "../../middlewares/multer";
import { homeControllers } from "./home.controllers";
import { homeValidations } from "./home.validation";

const router = Router();

// Public home routes
router.get("/stats", homeControllers.getHomeStats);
router.get("/featured", homeControllers.getFeaturedHomes);
router.get("/", checkAuth, homeControllers.getAllHomes);

// User home listings
router.get("/my-homes", auth, authorize(["USER", "ADMIN"]), homeControllers.getMyHomes);

// Single home listing
router.get("/:idOrSlug", checkAuth, homeControllers.getHomeByIdOrSlug);

// Home mutations
router.post("/", auth, authorize(["USER", "ADMIN"]), uploadListingImages, validateRequest(homeValidations.createHomeZodSchema), homeControllers.createHome);
router.patch("/:id", auth, authorize(["USER", "ADMIN"]), uploadListingImages, validateRequest(homeValidations.updateHomeZodSchema), homeControllers.updateHome);
router.patch("/:id/availability", auth, authorize(["USER", "ADMIN"]), validateRequest(homeValidations.updateAvailabilityStatusZodSchema), homeControllers.updateAvailabilityStatus);
router.delete("/:id", auth, authorize(["USER", "ADMIN"]), homeControllers.deleteHome);

// Admin moderation
router.patch("/:id/approve-reject", auth, authorize(["ADMIN"]), validateRequest(homeValidations.approveOrRejectHomeZodSchema), homeControllers.approveOrRejectHome);
router.patch("/:id/toggle-feature", auth, authorize(["ADMIN"]), homeControllers.toggleFeatureStatus);
router.patch("/:id/toggle-verify", auth, authorize(["ADMIN"]), homeControllers.toggleVerification);

export const homeRoutes = router;

