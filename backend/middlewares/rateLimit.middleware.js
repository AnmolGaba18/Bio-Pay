
import rateLimit from "express-rate-limit";

// General API rate limiter
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 200,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many requests. Please try again later.",
    },
});

// Authentication rate limiter
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many authentication attempts. Try again later.",
    },
});

// Biometric rate limiter
const biometricLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 15,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many biometric requests. Please try again later.",
    },
});

// Payment rate limiter
const paymentLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many payment requests. Please try again later.",
    },
});

export {
    generalLimiter,
    authLimiter,
    biometricLimiter,
    paymentLimiter,
};
