import { Router } from "express";
import auth from "../../middlewares/auth";
import checkAuth from "../../middlewares/checkAuth";
import authorize from "../../middlewares/authorized";
import validateRequest from "../../middlewares/validateRequest";
import { uploadListingImages } from "../../middlewares/multer";
import { listingControllers } from "./listing.controllers";
import { listingValidations } from "./listing.validation";

const router = Router();

// Public listing routes
router.get("/stats", listingControllers.getListingStats);
router.get("/featured", listingControllers.getFeaturedListings);
router.get("/", checkAuth, listingControllers.getAllListings);

// User listings
router.get("/my-listings", auth, authorize(["USER", "ADMIN"]), listingControllers.getMyListings);

// Single listing
router.get("/:idOrSlug", checkAuth, listingControllers.getListingByIdOrSlug);

// Listing mutations
router.post(
    "/",
    auth,
    authorize(["USER", "ADMIN"]),
    uploadListingImages,
    validateRequest(listingValidations.createListingZodSchema),
    listingControllers.createListing
);

router.patch(
    "/:id",
    auth,
    authorize(["USER", "ADMIN"]),
    uploadListingImages,
    validateRequest(listingValidations.updateListingZodSchema),
    listingControllers.updateListing
);

router.patch(
    "/:id/availability",
    auth,
    authorize(["USER", "ADMIN"]),
    validateRequest(listingValidations.updateAvailabilityStatusZodSchema),
    listingControllers.updateAvailabilityStatus
);

router.delete("/:id", auth, authorize(["USER", "ADMIN"]), listingControllers.deleteListing);

// Admin moderation
router.patch(
    "/:id/approve-reject",
    auth,
    authorize(["ADMIN"]),
    validateRequest(listingValidations.approveOrRejectListingZodSchema),
    listingControllers.approveOrRejectListing
);

router.patch("/:id/toggle-feature", auth, authorize(["ADMIN"]), listingControllers.toggleFeatureStatus);
router.patch("/:id/toggle-verify", auth, authorize(["ADMIN"]), listingControllers.toggleVerification);

export const listingRoutes = router;

