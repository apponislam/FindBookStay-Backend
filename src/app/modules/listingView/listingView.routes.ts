import { Router } from "express";
import auth from "../../middlewares/auth";
import authorize from "../../middlewares/authorized";
import { listingViewControllers } from "./listingView.controllers";

const router = Router();

// Get listing view analytics (Listing Owner or Admin)
router.get("/:listingId/analytics", auth, authorize(["USER", "ADMIN"]), listingViewControllers.getListingViewAnalytics);

export const listingViewRoutes = router;
