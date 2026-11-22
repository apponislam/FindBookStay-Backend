import { Router } from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { userAddressControllers } from "./userAddress.controllers";
import { userAddressValidations } from "./userAddress.validation";

const router = Router();

// Save new personal address (Home, Office, College, Other)
router.post(
    "/",
    auth,
    validateRequest(userAddressValidations.createUserAddressZodSchema),
    userAddressControllers.createUserAddress
);

// Get all saved personal addresses for current user
router.get("/", auth, userAddressControllers.getMyUserAddresses);

// Get single saved personal address by ID
router.get("/:id", auth, userAddressControllers.getUserAddressById);

// Update saved personal address
router.patch(
    "/:id",
    auth,
    validateRequest(userAddressValidations.updateUserAddressZodSchema),
    userAddressControllers.updateUserAddress
);

// Set personal address as default
router.patch("/:id/set-default", auth, userAddressControllers.setDefaultUserAddress);

// Delete saved personal address
router.delete("/:id", auth, userAddressControllers.deleteUserAddress);

export const userAddressRoutes = router;

