import { Router } from "express";
import auth from "../../middlewares/auth";
import authorize from "../../middlewares/authorized";
import { addressControllers } from "./address.controllers";

const router = Router();

// Hierarchy & Parent-Child Navigation Routes (Public for dropdowns & location search)
router.get("/tree", addressControllers.getAddressTree);
router.get("/children/:parentId", addressControllers.getChildrenByParentId);
router.get("/:id/parents", addressControllers.getParentsByAddressId);

// Standard CRUD
router.get("/", addressControllers.getAllAddresses);
router.get("/:id", addressControllers.getAddressById);

// Admin Only Mutations
router.post("/", auth, authorize(["ADMIN"]), addressControllers.createAddress);
router.patch("/:id", auth, authorize(["ADMIN"]), addressControllers.updateAddress);
router.delete("/:id", auth, authorize(["ADMIN"]), addressControllers.deleteAddress);

export const addressRoutes = router;
