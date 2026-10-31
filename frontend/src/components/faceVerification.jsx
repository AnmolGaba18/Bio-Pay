
import mongoose from "mongoose";
import { randomUUID } from "crypto";

import User from "../models/user.model.js";
import PaymentIntent from "../models/paymentIntent.model.js";
import WalletTransaction from "../models/walletTransaction.model.js";

import { generateFaceEmbedding } from "../services/biometric.service.js";
import { decryptEmbedding } from "../services/encryption.service.js";

// Provisional demo threshold. Requires proper calibration.
const FACE_MATCH_THRESHOLD = 0.70;

// Calculate cosine similarity
const calculateSimilarity = (embedding1, embedding2) => {
    if (
        !Array.isArray(embedding1) ||
        !Array.isArray(embedding2) ||
        embedding1.length !== 512 ||
        embedding2.length !== 512
    ) {
        throw new Error("Invalid face embeddings");
    }

    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;

    for (let i = 0; i < 512; i++) {
        dotProduct += embedding1[i] * embedding2[i];
        magnitude1 += embedding1[i] ** 2;
        magnitude2 += embedding2[i] ** 2;
    }

    if (magnitude1 === 0 || magnitude2 === 0) {
        throw new Error("Invalid face embeddings");
    }

    return dotProduct / (Math.sqrt(magnitude1) * Math.sqrt(magnitude2));
};

// CREATE PAYMENT INTENT
const createPaymentIntent = async (req, res) => {
    try {
        const senderId = req.user.id;
        const { receiverBioPayId, amount, description } = req.body;

        if (!receiverBioPayId || amount === undefined) {
            return res.status(400).json({
                success: false,
                message: "Receiver BioPay ID and amount are required",
            });
        }

        if (
            typeof amount !== "number" ||
            !Number.isSafeInteger(amount) ||
            amount <= 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Amount must be a positive whole number of rupees",
            });
        }

        if (
            description !== undefined &&
            (typeof description !== "string" || description.length > 150)
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid payment description",
            });
        }

        const sender = await User.findById(senderId);

        if (!sender) {
            return res.status(404).json({
                success: false,
                message: "Sender account not found",
            });
        }

        if (!sender.faceEnrolled) {
            return res.status(403).json({
                success: false,
                message: "Please enroll your face before making payments",
            });
        }

        const receiver = await User.findOne({
            bioPayId: receiverBioPayId.trim(),
        });

        if (!receiver) {
            return res.status(404).json({
                success: false,
                message: "Receiver not found",
            });
        }

        if (sender._id.equals(receiver._id)) {
            return res.status(400).json({
                success: false,
                message: "You cannot send money to yourself",
            });
        }

        if (sender.walletBalance < amount) {
            return res.status(400).json({
                success: false,
                message: "Insufficient wallet balance",
            });
        }

        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

        const paymentIntent = await PaymentIntent.create({
            senderId: sender._id,
            receiverId: receiver._id,
            amount,
            description: description?.trim() || "BioPay payment",
            status: "PENDING",
            expiresAt,
        });

        return res.status(201).json({
            success: true,
            message: "Payment intent created successfully",
            payment: {
                intentId: paymentIntent._id,
                receiver: {
                    fullName: receiver.fullName,
                    bioPayId: receiver.bioPayId,
                },
                amount: paymentIntent.amount,
                description: paymentIntent.description,
                status: paymentIntent.status,
                expiresAt: paymentIntent.expiresAt,
            },
        });
    } catch (error) {
        console.error("Create payment intent error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to create payment intent",
        });
    }
};

// VERIFY FACE FOR A SPECIFIC PAYMENT
const verifyPaymentFace = async (req, res) => {
    try {
        const senderId = req.user.id;
        const { intentId } = req.params;

        if (!mongoose.isValidObjectId(intentId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid payment intent ID",
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Face image is required",
            });
        }

        const paymentIntent = await PaymentIntent.findOne({
            _id: intentId,
            senderId,
        });

        if (!paymentIntent) {
            return res.status(404).json({
                success: false,
                message: "Payment intent not found",
            });
        }

        if (paymentIntent.status !== "PENDING") {
            return res.status(400).json({
                success: false,
                message: "Payment intent is not pending",
            });
        }

        if (paymentIntent.expiresAt <= new Date()) {
            paymentIntent.status = "EXPIRED";
            await paymentIntent.save();

            return res.status(400).json({
                success: false,
                message: "Payment intent has expired",
            });
        }

        const user = await User.findById(senderId).select(
            "+faceEmbeddingEncrypted +faceEmbeddingIv +faceEmbeddingAuthTag"
        );

        if (
            !user ||
            !user.faceEnrolled ||
            !user.faceEmbeddingEncrypted ||
            !user.faceEmbeddingIv ||
            !user.faceEmbeddingAuthTag
        ) {
            return res.status(400).json({
                success: false,
                message: "Face enrollment not found",
            });
        }

        const registeredEmbedding = decryptEmbedding({
            encryptedData: user.faceEmbeddingEncrypted,
            iv: user.faceEmbeddingIv,
            authTag: user.faceEmbeddingAuthTag,
        });

        const liveEmbedding = await generateFaceEmbedding(
            req.file.buffer,
            req.file.mimetype,
            req.file.originalname
        );

        const similarity = calculateSimilarity(
            registeredEmbedding,
            liveEmbedding
        );

        if (similarity < FACE_MATCH_THRESHOLD) {
            return res.status(401).json({
                success: false,
                message: "Face verification failed",
                biometric: {
                    verified: false,
                    similarity: Number(similarity.toFixed(4)),
                },
            });
        }

        const updatedIntent = await PaymentIntent.findOneAndUpdate(
            {
                _id: paymentIntent._id,
                senderId,
                status: "PENDING",
                expiresAt: { $gt: new Date() },
            },
            {
                $set: {
                    status: "VERIFIED",
                    faceVerifiedAt: new Date(),
                },
            },
            {
                returnDocument: "after",
            }
        );

        if (!updatedIntent) {
            return res.status(409).json({
                success: false,
                message: "Payment intent changed or expired. Please try again.",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Face verification successful. Payment is authorized.",
            payment: {
                intentId: updatedIntent._id,
                amount: updatedIntent.amount,
                status: updatedIntent.status,
                verifiedAt: updatedIntent.faceVerifiedAt,
            },
            biometric: {
                verified: true,
                similarity: Number(similarity.toFixed(4)),
            },
        });
    } catch (error) {
        console.error("Payment face verification error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Payment face verification failed",
        });
    }
};

// CONFIRM PAYMENT AND TRANSFER MONEY
const confirmPayment = async (req, res) => {
    const session = await mongoose.startSession();

    let paymentResult = null;

    try {
        const senderId = req.user.id;
        const { intentId } = req.params;

        if (!mongoose.isValidObjectId(intentId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid payment intent ID",
            });
        }

        await session.withTransaction(async () => {
            const now = new Date();
            const referenceId = randomUUID();

            // Claim the verified payment intent.
            // This prevents reuse and concurrent confirmation.
            const paymentIntent = await PaymentIntent.findOneAndUpdate(
                {
                    _id: intentId,
                    senderId,
                    status: "VERIFIED",
                    expiresAt: { $gt: now },
                },
                {
                    $set: {
                        status: "COMPLETED",
                        completedAt: now,
                        referenceId,
                    },
                },
                {
                    new: true,
                    session,
                }
            );

            if (!paymentIntent) {
                const error = new Error(
                    "Payment is not verified, has expired, or was already processed"
                );
                error.statusCode = 400;
                throw error;
            }

            // Debit sender only if sufficient balance exists
            const sender = await User.findOneAndUpdate(
                {
                    _id: senderId,
                    walletBalance: { $gte: paymentIntent.amount },
                },
                {
                    $inc: {
                        walletBalance: -paymentIntent.amount,
                    },
                },
                {
                    returnDocument: "after",
                    session,
                }
            );

            if (!sender) {
                const error = new Error("Insufficient wallet balance");
                error.statusCode = 400;
                throw error;
            }

            // Credit receiver
            const receiver = await User.findOneAndUpdate(
                {
                    _id: paymentIntent.receiverId,
                },
                {
                    $inc: {
                        walletBalance: paymentIntent.amount,
                    },
                },
                {
                    returnDocument: "after",
                    session,
                }
            );

            if (!receiver) {
                throw new Error("Receiver account not found");
            }

            // Create sender and receiver transaction records
            await WalletTransaction.create(
                [
                    {
                        userId: sender._id,
                        type: "PAYMENT",
                        amount: paymentIntent.amount,
                        balanceAfter: sender.walletBalance,
                        description: paymentIntent.description,
                        referenceId,
                    },
                    {
                        userId: receiver._id,
                        type: "RECEIVED",
                        amount: paymentIntent.amount,
                        balanceAfter: receiver.walletBalance,
                        description: `Received from ${sender.fullName}`,
                        referenceId,
                    },
                ],
                {
                    session,
                    ordered: true,
                }
            );

            paymentResult = {
                referenceId,
                amount: paymentIntent.amount,
                senderBalance: sender.walletBalance,
                receiverBalance: receiver.walletBalance,
                receiverName: receiver.fullName,
                status: "COMPLETED",
            };
        });

        return res.status(200).json({
            success: true,
            message: "Payment completed successfully",
            payment: paymentResult,
        });
    } catch (error) {
        console.error("Payment confirmation error:", error.message);

        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.statusCode
                ? error.message
                : "Payment could not be completed",
        });
    } finally {
        await session.endSession();
    }
};

export {
    createPaymentIntent,
    verifyPaymentFace,
    confirmPayment,
};
