import { Router } from "express";
import auth from "../../middlewares/auth";
import authorize from "../../middlewares/authorized";
import checkAuth from "../../middlewares/checkAuth";
import validateRequest from "../../middlewares/validateRequest";
import { faqControllers } from "./faq.controllers";
import { faqValidations } from "./faq.validation";

const router = Router();

// FAQ statistics and category summary (Admin only)
router.get("/stats", auth, authorize(["ADMIN"]), faqControllers.getFAQStats);

// Get all FAQs with search, category filtering, and grouped response (Public / Admin preview)
router.get("/", checkAuth, faqControllers.getAllFAQs);

// Get single FAQ details and increment view count (Public)
router.get("/:id", faqControllers.getFAQById);

// Submit helpful or not helpful feedback (Public)
router.post("/:id/feedback", validateRequest(faqValidations.feedbackFAQZodSchema), faqControllers.submitFAQFeedback);

// Create new FAQ item (Admin only)
router.post("/", auth, authorize(["ADMIN"]), validateRequest(faqValidations.createFAQZodSchema), faqControllers.createFAQ);

// Batch reorder FAQs display sequence (Admin only)
router.patch("/reorder", auth, authorize(["ADMIN"]), validateRequest(faqValidations.reorderFAQZodSchema), faqControllers.reorderFAQs);

// Update FAQ details (Admin only)
router.patch("/:id", auth, authorize(["ADMIN"]), validateRequest(faqValidations.updateFAQZodSchema), faqControllers.updateFAQ);

// Delete FAQ item with optional hard delete query flag (Admin only)
router.delete("/:id", auth, authorize(["ADMIN"]), faqControllers.deleteFAQ);

export const faqRoutes = router;
