import express from "express";
import { testEmailConfiguration, testWelcomeEmail } from "../controllers/emailControllerSimple.js";

const router = express.Router();

// Test email configuration (development mode)
router.post("/test", testEmailConfiguration);

// Test welcome email
router.post("/test-welcome", testWelcomeEmail);

export default router;