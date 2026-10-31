
import express from "express";
import multer from "multer";

import verifyJWT from "../middlewares/auth.middleware.js";
import { biometricLimiter } from "../middlewares/rateLimit.middleware.js";

import {
    enrollFace,
    verifyFace,
    deleteFaceEnrollment,
} from "../controllers/biometric.controller.js";

const router = express.Router();

const storage = multer.memoryStorage();

const upload = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024,
    },
    fileFilter: (req, file, callback) => {
        const allowedTypes = ["image/jpeg", "image/png"];

        if (!allowedTypes.includes(file.mimetype)) {
            return callback(
                new Error("Only JPEG and PNG images are supported")
            );
        }

        callback(null, true);
    },
});

// Authentication and rate limiting
router.use(verifyJWT);
router.use(biometricLimiter);

// Biometric routes
router.post("/enroll", upload.single("file"), enrollFace);
router.post("/verify", upload.single("file"), verifyFace);
router.delete("/enrollment", deleteFaceEnrollment);

export default router;
