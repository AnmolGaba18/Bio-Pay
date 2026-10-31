
import express from "express";

import userRoutes from "./routes/user.routes.js";
import authRoutes from "./routes/auth.routes.js";
import walletRoutes from "./routes/wallet.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import receiverRoutes from "./routes/receiver.routes.js";
import biometricRoutes from "./routes/biometric.routes.js";
import paymentIntentRoutes from "./routes/paymentIntent.routes.js";

import {
    generalLimiter,
} from "./middlewares/rateLimit.middleware.js";

const app = express();

// Global rate limiting
app.use(generalLimiter);

// Global middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/wallet", walletRoutes);
app.use("/api/v1/payments", paymentRoutes);
app.use("/api/v1/receivers", receiverRoutes);
app.use("/api/v1/biometric", biometricRoutes);
app.use("/api/v1/payment-intents", paymentIntentRoutes);

// Health check
app.get("/api/health", (req, res) => {
    res.status(200).json({
        success: true,
        message: "BioPay API is running",
    });
});

export { app };
