
import mongoose from "mongoose";
import crypto from "crypto";
import bcrypt from "bcryptjs";

import User from "../models/user.model.js";
import WalletTransaction from "../models/walletTransaction.model.js";

// REGISTER USER
const registerUser = async (req, res) => {
    let session;

    try {
        const { fullName, email, phone, password } = req.body;

        // Validate input types
        if (
            typeof fullName !== "string" ||
            typeof email !== "string" ||
            typeof phone !== "string" ||
            typeof password !== "string"
        ) {
            return res.status(400).json({
                success: false,
                message: "Please provide valid registration details",
            });
        }

        const normalizedName = fullName.trim();
        const normalizedEmail = email.trim().toLowerCase();
        const normalizedPhone = phone.trim();

        // Validate required fields
        if (!normalizedName || !normalizedEmail || !normalizedPhone || !password) {
            return res.status(400).json({
                success: false,
                message: "All fields are required",
            });
        }

        // Validate name
        if (normalizedName.length > 100) {
            return res.status(400).json({
                success: false,
                message: "Full name must not exceed 100 characters",
            });
        }

        // Validate email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (
            normalizedEmail.length > 254 ||
            !emailRegex.test(normalizedEmail)
        ) {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid email address",
            });
        }

        // Validate phone
        const phoneRegex = /^\+?[0-9]{7,15}$/;

        if (!phoneRegex.test(normalizedPhone)) {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid phone number",
            });
        }

        // Validate password
        if (password.length < 8 || password.length > 128) {
            return res.status(400).json({
                success: false,
                message: "Password must be between 8 and 128 characters",
            });
        }

        // Check existing account
        const existingUser = await User.findOne({
            $or: [
                { email: normalizedEmail },
                { phone: normalizedPhone },
            ],
        }).select("_id");

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "Email or phone number already registered",
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Generate unique BioPay ID
        const bioPayId =
            "BIO" + crypto.randomBytes(5).toString("hex").toUpperCase();

        // Create account and welcome transaction atomically
        session = await mongoose.startSession();

        let createdUser;

        await session.withTransaction(async () => {
            const users = await User.create(
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

            createdUser = users[0];

            await WalletTransaction.create(
                [{
                    userId: createdUser._id,
                    type: "TOP_UP",
                    amount: 5000,
                    balanceAfter: 5000,
                    description: "Welcome bonus - BioPay demo wallet",
                }],
                { session }
            );
        });

        return res.status(201).json({
            success: true,
            message: "BioPay account created successfully. ₹5,000 welcome bonus credited!",
            user: {
                id: createdUser._id,
                fullName: createdUser.fullName,
                email: createdUser.email,
                phone: createdUser.phone,
                bioPayId: createdUser.bioPayId,
                walletBalance: createdUser.walletBalance,
                faceEnrolled: createdUser.faceEnrolled,
            },
        });

    } catch (error) {
        console.error("Registration error:", error.message);

        // Handle duplicate database entries
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "Email, phone number or BioPay ID already exists",
            });
        }

        return res.status(500).json({
            success: false,
            message: "Account registration failed",
        });

    } finally {
        if (session) {
            await session.endSession();
        }
    }
};


// GET LOGGED-IN USER PROFILE
const getUserProfile = async (req, res) => {
    try {
        const userId = req.user?._id || req.user?.id;

        if (!userId || !mongoose.isValidObjectId(userId)) {
            return res.status(401).json({
                success: false,
                message: "Invalid authentication identity",
            });
        }

        // Return only safe profile fields
        const user = await User.findById(userId).select(
            "fullName email phone bioPayId walletBalance faceEnrolled faceConsentGiven createdAt"
        );

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


export {
    registerUser,
    getUserProfile,
};
