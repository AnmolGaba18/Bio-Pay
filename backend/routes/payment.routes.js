
import express from "express";
import verifyJWT from "../middlewares/auth.middleware.js";

const router = express.Router();

// Disable the old direct transfer endpoint.
// All new payments must use the payment-intent flow.
router.post("/transfer", verifyJWT, (req, res) => {
    return res.status(410).json({
        success: false,
        message: "Direct transfers are disabled.",
        nextStep: "Use the BioPay payment-intent flow.",
        endpoints: {
            createPayment: "POST /api/v1/payment-intents/create",
            verifyFace: "POST /api/v1/payment-intents/:intentId/verify-face",
            confirmPayment: "POST /api/v1/payment-intents/:intentId/confirm",
        },
    });
});

export default router;
