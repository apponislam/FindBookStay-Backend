import { Router } from "express";
import auth from "../../middlewares/auth";
import authorize from "../../middlewares/authorized";
import { policyControllers } from "./policy.controllers";

const router = Router();

// Public routes for viewing policies (accessible by website visitors and mobile apps)
router.get("/type/:typeOrSlug", policyControllers.getPolicyByTypeOrSlug);
router.get("/", policyControllers.getAllPolicies);

// Admin-only management routes (create/upsert, update, delete)
router.post("/", auth, authorize(["ADMIN"]), policyControllers.createOrUpdatePolicy);
router.patch("/:id", auth, authorize(["ADMIN"]), policyControllers.updatePolicyById);
router.delete("/:id", auth, authorize(["ADMIN"]), policyControllers.deletePolicyById);

export const policyRoutes = router;

