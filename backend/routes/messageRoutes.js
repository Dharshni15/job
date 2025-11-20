import express from "express";
import {
  sendMessage,
  getReceivedMessages,
  getSentMessages,
  getSingleMessage,
  markAsRead,
  markMultipleAsRead,
  deleteMessage,
  getConversation,
  getMessageStats
} from "../controllers/messageController.js";
import { isAuthenticated } from "../middlewares/auth.js";

const router = express.Router();

// Send a message
router.post("/send", isAuthenticated, sendMessage);

// Get received messages
router.get("/received", isAuthenticated, getReceivedMessages);

// Get sent messages
router.get("/sent", isAuthenticated, getSentMessages);

// Get conversation with a specific user
router.get("/conversation/:userId", isAuthenticated, getConversation);

// Get message statistics
router.get("/stats", isAuthenticated, getMessageStats);

// Get single message by ID
router.get("/:id", isAuthenticated, getSingleMessage);

// Mark message as read
router.patch("/read/:id", isAuthenticated, markAsRead);

// Mark multiple messages as read
router.patch("/read-multiple", isAuthenticated, markMultipleAsRead);

// Delete message
router.delete("/delete/:id", isAuthenticated, deleteMessage);

export default router;