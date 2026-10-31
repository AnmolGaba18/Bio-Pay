
import express from "express";
import multer from "multer";

import verifyJWT from "../middlewares/auth.middleware.js";
import { paymentLimiter } from "../middlewares/rateLimit.middleware.js";

import {
    createPaymentIntent,
    verifyPaymentFace,
    confirmPayment,
} from "../controllers/paymentIntent.controller.js";

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
router.use(paymentLimiter);

// Payment routes
router.post("/create", createPaymentIntent);

router.post(
    "/:intentId/verify-face",
    upload.single("file"),
    verifyPaymentFace
);

router.post("/:intentId/confirm", confirmPayment);

export default router;
