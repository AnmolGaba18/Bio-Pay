import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const verifyJWT = (req, res, next) => {
    try {
        // Check authorization header
        const authHeader = req.headers.authorization;

        if (
            !authHeader ||
            !authHeader.startsWith("Bearer ")
        ) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized: Token missing",
            });
        }

        const token = authHeader.slice(7).trim();

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized: Invalid token format",
            });
        }

        // Validate JWT secret
        if (!process.env.JWT_SECRET) {
            console.error("JWT_SECRET is missing from environment variables");

            return res.status(500).json({
                success: false,
                message: "Internal server configuration error",
            });
        }

        // Verify token signature and expiry
        const decodedToken = jwt.verify(
            token,
            process.env.JWT_SECRET,
            {
                algorithms: ["HS256"],
            }
        );

        // Validate token payload
        if (
            !decodedToken ||
            typeof decodedToken !== "object" ||
            !decodedToken._id ||
            !mongoose.isValidObjectId(decodedToken._id)
        ) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized: Invalid token payload",
            });
        }

        // Support both existing controller conventions
        req.user = {
            ...decodedToken,
            id: decodedToken._id,
        };

        next();

    } catch (error) {
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({
                success: false,
                message: "Authentication token has expired",
            });
        }

        if (
            error.name === "JsonWebTokenError" ||
            error.name === "NotBeforeError"
        ) {
            return res.status(401).json({
                success: false,
                message: "Invalid authentication token",
            });
        }

        console.error("Authentication middleware error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Authentication service error",
        });
    }
};

export default verifyJWT;
