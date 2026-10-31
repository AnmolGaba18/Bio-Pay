
import jwt from "jsonwebtoken";

const verifyJWT = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
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

        if (!process.env.JWT_SECRET) {
            console.error("JWT_SECRET is missing");

            return res.status(500).json({
                success: false,
                message: "Internal server configuration error",
            });
        }

        const decodedToken = jwt.verify(
            token,
            process.env.JWT_SECRET,
            {
                algorithms: ["HS256"],
            }
        );

        if (
            !decodedToken ||
            typeof decodedToken !== "object" ||
            !decodedToken._id
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
        return res.status(401).json({
            success: false,
            message: "Invalid or expired token",
        });
    }
};

export default verifyJWT;
