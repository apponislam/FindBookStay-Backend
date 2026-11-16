import { Router } from "express";
import auth from "../../middlewares/auth";
import authorize from "../../middlewares/authorized";
import validateRequest from "../../middlewares/validateRequest";
import { reviewControllers } from "./review.controllers";
import { reviewValidations } from "./review.validation";

const router = Router();

// Public: Get reviews for a specific listing
router.get("/listing/:listingId", reviewControllers.getReviewsByListing);

// Authenticated: My submitted reviews
router.get("/my-reviews", auth, authorize(["USER", "ADMIN"]), reviewControllers.getMyReviews);

// Authenticated: Create review
router.post(
    "/",
    auth,
    authorize(["USER", "ADMIN"]),
    validateRequest(reviewValidations.createReviewZodSchema),
    reviewControllers.createReview
);

// Authenticated: Update own review
router.patch(
    "/:id",
    auth,
    authorize(["USER", "ADMIN"]),
    validateRequest(reviewValidations.updateReviewZodSchema),
    reviewControllers.updateReview
);

// Authenticated: Delete own review (or Admin)
router.delete("/:id", auth, authorize(["USER", "ADMIN"]), reviewControllers.deleteReview);

// Authenticated: Host or Admin reply to a review
router.patch(
    "/:id/reply",
    auth,
    authorize(["USER", "ADMIN"]),
    validateRequest(reviewValidations.replyReviewZodSchema),
    reviewControllers.replyToReview
);

// Admin: Browse all reviews
router.get("/", auth, authorize(["ADMIN"]), reviewControllers.getAllReviews);

export const reviewRoutes = router;

