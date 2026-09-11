import { Router } from "express";
import { login, sendOtp, signup, verifyOtp } from "../controllers/authController.js";
import rateLimit from "express-rate-limit";

const router = Router();

const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false
});

router.post("/signup", signup);
router.post("/login", login);
router.post("/otp/send", otpLimiter, sendOtp);
router.post("/otp/verify", otpLimiter, verifyOtp);

export default router;
