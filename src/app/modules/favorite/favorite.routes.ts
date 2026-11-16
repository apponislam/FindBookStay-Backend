import { Router } from "express";
import auth from "../../middlewares/auth";
import authorize from "../../middlewares/authorized";
import validateRequest from "../../middlewares/validateRequest";
import { favoriteControllers } from "./favorite.controllers";
import { favoriteValidations } from "./favorite.validation";

const router = Router();

// Public: Total bookmarks count for a listing
router.get("/count/:listingId", favoriteControllers.getListingBookmarkCount);

// Authenticated: 1-click toggle favorite (Save / Remove)
router.post(
    "/toggle",
    auth,
    authorize(["USER", "ADMIN"]),
    validateRequest(favoriteValidations.toggleFavoriteZodSchema),
    favoriteControllers.toggleFavorite
);

// Authenticated: Get my saved favorite listings
router.get("/my-favorites", auth, authorize(["USER", "ADMIN"]), favoriteControllers.getMyFavorites);

// Authenticated: Check if specific listing is favorited by current user
router.get("/check/:listingId", auth, authorize(["USER", "ADMIN"]), favoriteControllers.checkIsFavorite);

// Authenticated: Update note on a saved listing
router.patch(
    "/:listingId/note",
    auth,
    authorize(["USER", "ADMIN"]),
    validateRequest(favoriteValidations.updateFavoriteNoteZodSchema),
    favoriteControllers.updateFavoriteNote
);

// Authenticated: Explicitly remove from favorites
router.delete("/:listingId", auth, authorize(["USER", "ADMIN"]), favoriteControllers.removeFavorite);

export const favoriteRoutes = router;

