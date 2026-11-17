import { Router } from "express";
import { conversationControllers } from "./conversation.controllers";
import { conversationValidations } from "./conversation.validation";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";

const router = Router();

// All conversation routes require user authentication
router.post("/", auth, validateRequest(conversationValidations.createConversationZodSchema), conversationControllers.createOrGetConversation);

router.get("/", auth, conversationControllers.getUserConversations);
router.get("/:id", auth, conversationControllers.getConversationById);
router.patch("/:id/archive", auth, conversationControllers.toggleArchiveConversation);
router.patch("/:id/block", auth, conversationControllers.toggleBlockConversation);

export const conversationRoutes = router;
