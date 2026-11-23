import { Router } from "express";
import auth from "../../middlewares/auth";
import authorize from "../../middlewares/authorized";
import { lastViewedControllers } from "./lastViewed.controllers";

const router = Router();

// User last viewed history routes
router.get("/", auth, authorize(["USER", "ADMIN"]), lastViewedControllers.getMyLastViewed);
router.post("/", auth, authorize(["USER", "ADMIN"]), lastViewedControllers.recordLastViewed);
router.post("/:listingId", auth, authorize(["USER", "ADMIN"]), lastViewedControllers.recordLastViewed);
router.delete("/:listingId", auth, authorize(["USER", "ADMIN"]), lastViewedControllers.removeLastViewedItem);
router.delete("/", auth, authorize(["USER", "ADMIN"]), lastViewedControllers.clearMyLastViewed);

export const lastViewedRoutes = router;
