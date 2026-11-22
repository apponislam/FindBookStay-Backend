import { Router } from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { toletControllers } from "./tolet.controllers";
import { toletValidations } from "./tolet.validation";

const router = Router();

// Create new To-Let data for rent house
router.post(
    "/",
    auth,
    validateRequest(toletValidations.createToletZodSchema),
    toletControllers.createTolet
);

// Get all To-Let notices for current user
router.get("/", auth, toletControllers.getMyTolets);

// Get single To-Let data by ID (for PDF design rendering)
router.get("/:id", toletControllers.getToletById);

// Update To-Let data
router.patch(
    "/:id",
    auth,
    validateRequest(toletValidations.updateToletZodSchema),
    toletControllers.updateTolet
);

// Delete To-Let data
router.delete("/:id", auth, toletControllers.deleteTolet);

export const toletRoutes = router;
