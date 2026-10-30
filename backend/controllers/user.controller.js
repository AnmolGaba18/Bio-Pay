
import mongoose from "mongoose";
import User from "../models/user.model.js";
import WalletTransaction from "../models/walletTransaction.model.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const registerUser = async (req, res) => {
    const { fullName, email, phone, password } = req.body;

    try {
        // Validate required fields
        if (!fullName || !email || !phone || !password) {
            return res.status(400).json({
                success: false,
                message: "All fields are required",
            });
        }

        if (typeof password !== "string" || password.length < 8) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 8 characters",
            });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const normalizedPhone = phone.trim();
        const normalizedName = fullName.trim();

        // Validate basic input types
        if (!normalizedName || !normalizedEmail || !normalizedPhone) {
            return res.status(400).json({
                success: false,
                message: "Please provide valid registration details",
            });
        }

        // Check existing user
        const existingUser = await User.findOne({
            $or: [
                { email: normalizedEmail },
                { phone: normalizedPhone },
            ],
        });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "Email or phone number already registered",
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Generate BioPay ID
        const bioPayId =
            "BIO" + crypto.randomBytes(5).toString("hex").toUpperCase();

        // Create user and welcome bonus atomically
        const session = await mongoose.startSession();

        let user;

        try {
            await session.withTransaction(async () => {
                [user] = await User.create(
                    [{
                        fullName: normalizedName,
                        email: normalizedEmail,
                        phone: normalizedPhone,
                        password: hashedPassword,
                        bioPayId,
                        walletBalance: 5000,
                    }],
                    { session }
                );

                await WalletTransaction.create(
                    [{
                        userId: user._id,
                        type: "TOP_UP",
                        amount: 5000,
                        balanceAfter: 5000,
                        description: "Welcome bonus - BioPay demo wallet",
                    }],
                    { session }
                );
            });
        } finally {
            await session.endSession();
        }

        // Registration response
        return res.status(201).json({
            success: true,
            message: "BioPay account created successfully. ₹5,000 welcome bonus credited!",
            user: {
                id: user._id,
                fullName: user.fullName,
                email: user.email,
                phone: user.phone,
                bioPayId: user.bioPayId,
                walletBalance: user.walletBalance,
                faceEnrolled: user.faceEnrolled,
            },
        });

    } catch (error) {
        console.error("Registration error:", error);

        // Handle duplicate key errors
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "Email, phone number or BioPay ID already exists",
            });
        }

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};


// Get logged-in user's profile
const getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id)
            .select("-password");

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        return res.status(200).json({
            success: true,
            user,
        });

    } catch (error) {
        console.error("Profile error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to fetch profile",
        });
    }
};

export { registerUser, getUserProfile };
