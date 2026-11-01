
import express from "express";
import cors from "cors";
import helmet from "helmet";

import userRoutes from "./routes/user.routes.js";
import authRoutes from "./routes/auth.routes.js";
import walletRoutes from "./routes/wallet.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import receiverRoutes from "./routes/receiver.routes.js";
import biometricRoutes from "./routes/biometric.routes.js";
import paymentIntentRoutes from "./routes/paymentIntent.routes.js";

import { generalLimiter } from "./middlewares/rateLimit.middleware.js";

const app = express();

// Security headers
app.use(helmet());

// CORS configuration
const allowedOrigins = (
    process.env.FRONTEND_URL || "http://localhost:5173"
)
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

const corsOptions = {
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        return callback(new Error("Origin not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

// Global rate limiting
app.use(generalLimiter);

// Request body limits
app.use(express.json({ limit: "32kb" }));

app.use(
    express.urlencoded({
        extended: true,
        limit: "32kb",
    })
);

// API routes
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/wallet", walletRoutes);
app.use("/api/v1/payments", paymentRoutes);
app.use("/api/v1/receivers", receiverRoutes);
app.use("/api/v1/biometric", biometricRoutes);
app.use("/api/v1/payment-intents", paymentIntentRoutes);

// Health check
app.get("/api/health", (req, res) => {
    return res.status(200).json({
        success: true,
        message: "BioPay API is running",
    });
});

// 404 handler
app.use((req, res) => {
    return res.status(404).json({
        success: false,
        message: "API endpoint not found",
    });
});

// Centralized error handler
app.use((error, req, res, next) => {
    console.error("API Error:", error.message);

    if (res.headersSent) {
        return next(error);
    }

    if (error.name === "MulterError") {
        return res.status(400).json({
            success: false,
            message: "File upload failed. Check file size and format.",
        });
    }

    if (
        error.message === "Origin not allowed by CORS" ||
        error.message === "Not allowed by CORS"
    ) {
        return res.status(403).json({
            success: false,
            message: "Cross-origin request not allowed",
        });
    }

    if (
        error.message === "Only JPEG and PNG images are supported"
    ) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }

    return res.status(500).json({
        success: false,
        message: "Internal server error",
    });
});

export { app };
