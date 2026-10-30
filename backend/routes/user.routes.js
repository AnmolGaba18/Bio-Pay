import express from "express";
import {
    registerUser,
    getUserProfile,
} from "../controllers/user.controller.js";
import verifyJWT from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/register", registerUser);
router.get("/profile", verifyJWT, getUserProfile);

export default router;
