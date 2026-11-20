import { Router } from "express";
import auth from "../../middlewares/auth";
import authorize from "../../middlewares/authorized";
import validateRequest from "../../middlewares/validateRequest";
import { userControllers } from "./user.controllers";
import { userValidations } from "./user.validation";

const router = Router();

// User analytics & stats (Admin only)
router.get("/stats", auth, authorize(["ADMIN"]), userControllers.getUserStats);

// Memory-safe streaming JSON export (Admin only)
router.get("/export", auth, authorize(["ADMIN"]), userControllers.exportUsersStream);

// Get all users with filters, search, and pagination (Admin only)
router.get("/", auth, authorize(["ADMIN"]), userControllers.getAllUsers);

// View active device sessions for a user (Admin only)
router.get("/:id/sessions", auth, authorize(["ADMIN"]), userControllers.getUserSessions);

// Terminate specific device session for a user (Admin only)
router.delete("/:id/sessions/:deviceId", auth, authorize(["ADMIN"]), userControllers.terminateUserSession);

// Terminate all device sessions and revoke tokens for a user (Admin only)
router.post("/:id/sessions/terminate-all", auth, authorize(["ADMIN"]), userControllers.terminateAllUserSessions);

// Disable or Enable user account with reason note (Admin only)
router.patch(
    "/:id/status",
    auth,
    authorize(["ADMIN"]),
    validateRequest(userValidations.updateUserStatusZodSchema),
    userControllers.updateUserStatus
);

// Force change user password (Admin only)
router.patch(
    "/:id/password",
    auth,
    authorize(["ADMIN"]),
    validateRequest(userValidations.changeUserPasswordByAdminZodSchema),
    userControllers.changeUserPasswordByAdmin
);

// Update user profile details (Admin only)
router.patch(
    "/:id",
    auth,
    authorize(["ADMIN"]),
    validateRequest(userValidations.updateUserByAdminZodSchema),
    userControllers.updateUserByAdmin
);

// Soft delete or permanently delete user account (Admin only)
router.delete("/:id", auth, authorize(["ADMIN"]), userControllers.deleteUserByAdmin);

// Get single user by ID (Admin only)
router.get("/:id", auth, authorize(["ADMIN"]), userControllers.getUserById);

export const userRoutes = router;
