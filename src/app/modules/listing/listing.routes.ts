import { Router } from "express";
import auth from "../../middlewares/auth";
import checkAuth from "../../middlewares/checkAuth";
import authorize from "../../middlewares/authorized";
import validateRequest from "../../middlewares/validateRequest";
import { uploadListingImages } from "../../middlewares/multer";
import { listingControllers } from "./listing.controllers";
import { listingValidations } from "./listing.validation";

const router = Router();

// ==========================================
// 1. Public Marketplace & Browsing Routes
// ==========================================

// Global listing stats
router.get("/stats", listingControllers.getListingStats);

// Featured listings across verticals
router.get("/featured", listingControllers.getFeaturedListings);

// Explore listings with query filters, full-text search, and geo-radius
router.get("/", checkAuth, listingControllers.getAllListings);

// ==========================================
// 2. Authenticated User Routes (My Listings)
// ==========================================

// User's own listings (Must be placed before /:idOrSlug)
router.get("/my-listings", auth, authorize(["USER", "ADMIN"]), listingControllers.getMyListings);

// ==========================================
// 3. Public Detail Route (With view counter)
// ==========================================

// Get listing details by MongoDB _id or SEO friendly slug
router.get("/:idOrSlug", checkAuth, listingControllers.getListingByIdOrSlug);

// ==========================================
// 4. Authenticated Mutations (User & Admin)
// ==========================================

// Create new listing (with multipart image upload & Sharp WebP optimization)
router.post(
    "/",
    auth,
    authorize(["USER", "ADMIN"]),
    uploadListingImages,
    validateRequest(listingValidations.createListingZodSchema),
    listingControllers.createListing
);

// Update listing (Owner or Admin)
router.patch(
    "/:id",
    auth,
    authorize(["USER", "ADMIN"]),
    uploadListingImages,
    validateRequest(listingValidations.updateListingZodSchema),
    listingControllers.updateListing
);

// Update listing availability status (AVAILABLE, BOOKED, RENTED, SOLD)
router.patch(
    "/:id/availability",
    auth,
    authorize(["USER", "ADMIN"]),
    validateRequest(listingValidations.updateAvailabilityStatusZodSchema),
    listingControllers.updateAvailabilityStatus
);

// Soft delete listing (Owner or Admin)
router.delete("/:id", auth, authorize(["USER", "ADMIN"]), listingControllers.deleteListing);

// ==========================================
// 5. Admin Moderation & Curation Routes
// ==========================================

// Approve or Reject listing
router.patch(
    "/:id/approve-reject",
    auth,
    authorize(["ADMIN"]),
    validateRequest(listingValidations.approveOrRejectListingZodSchema),
    listingControllers.approveOrRejectListing
);

// Toggle Featured Status
router.patch("/:id/toggle-feature", auth, authorize(["ADMIN"]), listingControllers.toggleFeatureStatus);

// Toggle Verified Status
router.patch("/:id/toggle-verify", auth, authorize(["ADMIN"]), listingControllers.toggleVerification);

export const listingRoutes = router;

