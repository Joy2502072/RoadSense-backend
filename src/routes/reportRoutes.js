import { Router } from "express";
import { authenticate, requireRole } from "../middleware/auth.js";
import { imageUpload } from "../middleware/upload.js";
import {
  createReport,
  dashboardStats,
  getReport,
  listReports,
  updateReport
} from "../controllers/reportController.js";

const router = Router();

router.get("/stats", dashboardStats);
router.get("/", listReports);
router.get("/:id", getReport);

router.post(
  "/",
  authenticate,
  requireRole("citizen"),
  imageUpload.single("image"),
  createReport
);

router.patch(
  "/:id",
  authenticate,
  requireRole("admin"),
  updateReport
);

export default router;
