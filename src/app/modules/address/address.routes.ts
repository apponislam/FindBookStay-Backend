import { Router } from "express";
import auth from "../../middlewares/auth";
import authorize from "../../middlewares/authorized";
import validateRequest from "../../middlewares/validateRequest";
import { addressControllers } from "./address.controllers";
import { addressValidations } from "./address.validation";

const router = Router();

// Location hierarchy tree (Public)
router.get("/tree", addressControllers.getAddressTree);

// Child locations of a parent (Public)
router.get("/children/:parentId", addressControllers.getChildrenByParentId);

// Location parent hierarchy lineage (Public)
router.get("/:id/parents", addressControllers.getParentsByAddressId);

// Get all site addresses with filters (Public)
router.get("/", addressControllers.getAllAddresses);

// Get single site address by ID (Public)
router.get("/:id", addressControllers.getAddressById);

// Create new site administrative address (Admin only)
router.post(
    "/",
    auth,
    authorize(["ADMIN"]),
    validateRequest(addressValidations.createAddressZodSchema),
    addressControllers.createAddress
);

// Update site administrative address (Admin only)
router.patch(
    "/:id",
    auth,
    authorize(["ADMIN"]),
    validateRequest(addressValidations.updateAddressZodSchema),
    addressControllers.updateAddress
);

// Delete site administrative address (Admin only)
router.delete("/:id", auth, authorize(["ADMIN"]), addressControllers.deleteAddress);

export const addressRoutes = router;
