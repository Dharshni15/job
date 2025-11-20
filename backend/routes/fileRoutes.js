import express from "express";
import { getFile } from "../controllers/fileController.js";

const router = express.Router();

router.get("/:id", getFile);

export default router;