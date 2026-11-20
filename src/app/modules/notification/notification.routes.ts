import { Router } from "express";
import { notificationControllers } from "./notification.controllers";
import { notificationValidations } from "./notification.validation";
import auth from "../../middlewares/auth";
import authorize from "../../middlewares/authorized";
import validateRequest from "../../middlewares/validateRequest";

const router = Router();

// Fast unread count from Redis for app badge
router.get("/unread-count", auth, notificationControllers.getUnreadCount);

// Mark all notifications as read for current user
router.patch("/read-all", auth, notificationControllers.markAllAsRead);

// Clear all notifications for current user
router.delete("/clear-all", auth, notificationControllers.clearAllNotifications);

// Register or rotate mobile FCM push token
router.post(
    "/fcm-token",
    auth,
    validateRequest(notificationValidations.fcmTokenZodSchema),
    notificationControllers.registerFcmToken
);

// Unregister mobile FCM push token on logout
router.delete(
    "/fcm-token",
    auth,
    validateRequest(notificationValidations.fcmTokenZodSchema),
    notificationControllers.unregisterFcmToken
);

// Admin only: Send individual or broadcast custom notification
router.post(
    "/send",
    auth,
    authorize(["ADMIN"]),
    validateRequest(notificationValidations.sendNotificationZodSchema),
    notificationControllers.sendCustomNotification
);

// Get paginated notifications for current user
router.get("/", auth, notificationControllers.getMyNotifications);

// Mark single notification as read
router.patch("/:id/read", auth, notificationControllers.markAsRead);

// Delete single notification
router.delete("/:id", auth, notificationControllers.deleteNotification);

export const notificationRoutes = router;
