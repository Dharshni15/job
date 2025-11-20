import express from "express";
import { 
  postCertificate,
  getAllCertificates,
  getMyCertificates,
  getSingleCertificate,
  updateCertificate,
  deleteCertificate,
  toggleLikeCertificate
} from "../controllers/certificateController.js";
import { isAuthenticated } from "../middlewares/auth.js";

const router = express.Router();

// Post a new certificate (Job Seekers only)
router.post("/post", isAuthenticated, postCertificate);

// Get all certificates (with pagination and filtering)
router.get("/getall", isAuthenticated, getAllCertificates);

// Get certificates by current user (Job Seekers only)
router.get("/me", isAuthenticated, getMyCertificates);

// Get single certificate by ID
router.get("/:id", isAuthenticated, getSingleCertificate);

// Update certificate (Job Seekers only, own certificates)
router.put("/update/:id", isAuthenticated, updateCertificate);

// Delete certificate (Job Seekers only, own certificates)
router.delete("/delete/:id", isAuthenticated, deleteCertificate);

// Like/Unlike certificate
router.patch("/like/:id", isAuthenticated, toggleLikeCertificate);

export default router;