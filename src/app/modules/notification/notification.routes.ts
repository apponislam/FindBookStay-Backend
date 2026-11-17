import { Router } from "express";
import { notificationControllers } from "./notification.controllers";
import { notificationValidations } from "./notification.validation";
import auth from "../../middlewares/auth";
import authorize from "../../middlewares/authorized";
import validateRequest from "../../middlewares/validateRequest";

const router = Router();

// Get fast unread notifications count for badge
router.get("/unread-count", auth, notificationControllers.getUnreadCount);

// Mark all notifications as read for current user
router.patch("/read-all", auth, notificationControllers.markAllAsRead);

// Clear all notifications for current user
router.delete("/clear-all", auth, notificationControllers.clearAllNotifications);

// Admin only: Send individual or broadcast custom notification
router.post("/send", auth, authorize(["ADMIN"]), validateRequest(notificationValidations.sendNotificationZodSchema), notificationControllers.sendCustomNotification);

// Get paginated notifications for current user
router.get("/", auth, notificationControllers.getMyNotifications);

// Mark single notification as read
router.patch("/:id/read", auth, notificationControllers.markAsRead);

// Delete single notification
router.delete("/:id", auth, notificationControllers.deleteNotification);

export const notificationRoutes = router;
