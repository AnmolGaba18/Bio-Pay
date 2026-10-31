import express from "express";
import { loginUser } from "../controllers/auth.controller.js";
import { authLimiter } from "../middlewares/rateLimit.middleware.js";

const router = express.Router();

router.post("/login", authLimiter, loginUser);

export default router;
