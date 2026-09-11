import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { testDbConnection } from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import contactRoutes from "./routes/contactRoutes.js";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 5000);
const uploadDir = path.resolve("uploads");

fs.mkdirSync(uploadDir, { recursive: true });

app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  credentials: false
}));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

app.use("/uploads", express.static(uploadDir));

app.get("/api/health", async (_req, res) => {
  try {
    await testDbConnection();
    res.json({ status: "ok", database: "connected" });
  } catch {
    res.status(503).json({ status: "error", database: "disconnected" });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/contact", contactRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ message: "Image must be smaller than 2 MB." });
  }
  res.status(400).json({ message: err.message || "Request failed." });
});

app.use((_req, res) => {
  res.status(404).json({ message: "API endpoint not found." });
});

app.listen(PORT, async () => {
  console.log(`RoadSense backend running on http://localhost:${PORT}`);
  try {
    await testDbConnection();
    console.log("MySQL database connected.");
  } catch (error) {
    console.error("MySQL connection failed:", error.message);
  }
});
