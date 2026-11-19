import { Router } from "express";
import { authControllers } from "./auth.controllers";
import auth from "../../middlewares/auth";
import { uploadProfileImage } from "../../middlewares/multer";
const router = Router();

// Public routes
router.post("/register", uploadProfileImage, authControllers.register);
router.post("/login", authControllers.login);
router.get("/verify-email", authControllers.verifyEmail);
router.post("/verify-email", authControllers.verifyEmail);
router.post("/resend-verification", authControllers.resendVerificationEmail);
router.post("/refresh-token", authControllers.refreshAccessToken);
router.post("/forgot-password", authControllers.requestPasswordReset);
router.post("/verify-otp", authControllers.verifyOtp);
router.post("/resend-otp", authControllers.resendOtp);
router.post("/reset-password", authControllers.resetPassword);
router.get("/referral/:code", authControllers.validateReferralCode);

// Real-time pre-registration validity/availability check (email, phone, referral)
router.post("/check-validity", authControllers.checkFieldValidity);
router.get("/check-validity", authControllers.checkFieldValidity);
router.post("/check-availability", authControllers.checkFieldValidity);
router.get("/check-availability", authControllers.checkFieldValidity);

// Protected routes (require auth)
router.get("/me", auth, authControllers.getMe);
router.post("/logout", auth, authControllers.logout);
router.patch("/profile", auth, uploadProfileImage, authControllers.updateProfile);
router.get("/live-location", auth, authControllers.getLiveLocation);
router.patch("/live-location", auth, authControllers.updateLiveLocation);
router.get("/live-location", auth, authControllers.getLiveLocation);
router.patch("/live-location", auth, authControllers.updateLiveLocation);
router.post("/change-password", auth, authControllers.changePassword);
router.post("/update-email", auth, authControllers.updateEmail);
router.get("/verify-new-email", authControllers.verifyNewEmail);
router.post("/resend-email-update", auth, authControllers.resendEmailUpdate);
router.post("/fcm-token", auth, authControllers.addFcmToken);
router.delete("/fcm-token", auth, authControllers.removeFcmToken);
router.delete("/me", auth, authControllers.deleteAccount);

export const authRoutes = router;
