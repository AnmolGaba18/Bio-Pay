
import express from "express";

import {
    registerUser,
    getUserProfile,
} from "../controllers/user.controller.js";

import verifyJWT from "../middlewares/auth.middleware.js";
import { authLimiter } from "../middlewares/rateLimit.middleware.js";

const router = express.Router();

// Registration with rate limiting
router.post("/register", authLimiter, registerUser);

// Protected profile route
router.get("/profile", verifyJWT, getUserProfile);

export default router;
