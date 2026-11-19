import { Router } from "express";
import auth from "../../middlewares/auth";
import authorize from "../../middlewares/authorized";
import validateRequest from "../../middlewares/validateRequest";
import { favoriteControllers } from "./favorite.controllers";
import { favoriteValidations } from "./favorite.validation";

const router = Router();

// 1-Click Toggle Favorite (Add / Soft-delete)
router.post("/toggle", auth, authorize(["USER", "ADMIN"]), validateRequest(favoriteValidations.toggleFavoriteZodSchema), favoriteControllers.toggleFavorite);

// Get my saved favorite listings
router.get("/my-favorites", auth, authorize(["USER", "ADMIN"]), favoriteControllers.getMyFavorites);

// Update private note on a saved listing
router.patch("/:listingId/note", auth, authorize(["USER", "ADMIN"]), validateRequest(favoriteValidations.updateFavoriteNoteZodSchema), favoriteControllers.updateFavoriteNote);

export const favoriteRoutes = router;
