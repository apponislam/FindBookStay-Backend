import { Router } from "express";
import { messageControllers } from "./message.controllers";
import { messageValidations } from "./message.validation";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { uploadMessageAttachments } from "../../middlewares/multer";

const router = Router();

// Send message (supports JSON and multipart/form-data for attachments)
router.post("/", auth, uploadMessageAttachments, validateRequest(messageValidations.sendMessageZodSchema), messageControllers.sendMessage);

// Reconnection catch-up sync (must be declared before :conversationId)
router.get("/sync/:conversationId", auth, messageControllers.syncMessages);

// Get paginated messages for a conversation (supports both cursor and page/limit)
router.get("/:conversationId", auth, messageControllers.getConversationMessages);

// Mark all unread messages in conversation as read
router.patch("/read/:conversationId", auth, messageControllers.markMessagesAsRead);

// Delete single message
router.delete("/:id", auth, messageControllers.deleteMessage);

export const messageRoutes = router;
