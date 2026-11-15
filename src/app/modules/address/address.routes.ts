import { Router } from "express";
import auth from "../../middlewares/auth";
import authorize from "../../middlewares/authorized";
import { addressControllers } from "./address.controllers";

const router = Router();

router.get("/", addressControllers.getAllAddresses);
router.get("/:id", addressControllers.getAddressById);
router.post("/", auth, authorize(["ADMIN"]), addressControllers.createAddress);
router.patch("/:id", auth, authorize(["ADMIN"]), addressControllers.updateAddress);
router.delete("/:id", auth, authorize(["ADMIN"]), addressControllers.deleteAddress);

export const addressRoutes = router;
