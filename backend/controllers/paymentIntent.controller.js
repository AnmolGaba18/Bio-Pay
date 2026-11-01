
import mongoose from "mongoose";
import { randomUUID } from "crypto";

import User from "../models/user.model.js";
import PaymentIntent from "../models/paymentIntent.model.js";
import WalletTransaction from "../models/walletTransaction.model.js";

import { generateFaceEmbedding } from "../services/biometric.service.js";
import { decryptEmbedding } from "../services/encryption.service.js";

// Configuration
const FACE_MATCH_THRESHOLD = 0.70;
const FACE_AUTHORIZATION_VALIDITY = 5 * 60 * 1000;
const PAYMENT_INTENT_VALIDITY = 5 * 60 * 1000;

// Demo transaction limit: ₹1,00,000 per payment
const MAX_PAYMENT_AMOUNT = 100000;


// COSINE SIMILARITY
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
        const value1 = embedding1[i];
        const value2 = embedding2[i];

        if (
            typeof value1 !== "number" ||
            typeof value2 !== "number" ||
            !Number.isFinite(value1) ||
            !Number.isFinite(value2)
        ) {
            throw new Error("Invalid face embedding values");
        }

        dotProduct += value1 * value2;
        magnitude1 += value1 ** 2;
        magnitude2 += value2 ** 2;
    }

    if (magnitude1 === 0 || magnitude2 === 0) {
        throw new Error("Invalid face embeddings");
    }

    const similarity =
        dotProduct / (Math.sqrt(magnitude1) * Math.sqrt(magnitude2));

    if (!Number.isFinite(similarity)) {
        throw new Error("Unable to calculate face similarity");
    }

    return Math.max(-1, Math.min(1, similarity));
};


// CREATE PAYMENT INTENT
const createPaymentIntent = async (req, res) => {
    try {
        const senderId = req.user?._id || req.user?.id;

        const { receiverBioPayId, amount, description } = req.body;

        if (
            !senderId ||
            !mongoose.isValidObjectId(senderId)
        ) {
            return res.status(401).json({
                success: false,
                message: "Invalid authentication identity",
            });
        }

        if (
            typeof receiverBioPayId !== "string" ||
            !receiverBioPayId.trim() ||
            amount === undefined
        ) {
            return res.status(400).json({
                success: false,
                message: "Receiver BioPay ID and amount are required",
            });
        }

        if (
            typeof amount !== "number" ||
            !Number.isSafeInteger(amount) ||
            amount < 1 ||
            amount > MAX_PAYMENT_AMOUNT
        ) {
            return res.status(400).json({
                success: false,
                message: `Payment amount must be between ₹1 and ₹${MAX_PAYMENT_AMOUNT}`,
            });
        }

        if (
            description !== undefined &&
            (
                typeof description !== "string" ||
                description.trim().length > 150
            )
        ) {
            return res.status(400).json({
                success: false,
                message: "Payment description must not exceed 150 characters",
            });
        }

        const sender = await User.findById(senderId);

        if (!sender) {
            return res.status(404).json({
                success: false,
                message: "Sender account not found",
            });
        }

        if (
            !sender.faceEnrolled ||
            !sender.faceConsentGiven ||
            !sender.faceConsentAt
        ) {
            return res.status(403).json({
                success: false,
                message: "Face enrollment and valid biometric consent are required",
            });
        }

        if (sender.walletBalance < amount) {
            return res.status(400).json({
                success: false,
                message: "Insufficient wallet balance",
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

        const paymentIntent = await PaymentIntent.create({
            senderId: sender._id,
            receiverId: receiver._id,
            amount,
            description: description?.trim() || "BioPay payment",
            status: "PENDING",
            expiresAt: new Date(Date.now() + PAYMENT_INTENT_VALIDITY),
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


// VERIFY FACE FOR PAYMENT
const verifyPaymentFace = async (req, res) => {
    try {
        const senderId = req.user?._id || req.user?.id;
        const { intentId } = req.params;

        if (
            !senderId ||
            !mongoose.isValidObjectId(senderId)
        ) {
            return res.status(401).json({
                success: false,
                message: "Invalid authentication identity",
            });
        }

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
            status: "PENDING",
            expiresAt: { $gt: new Date() },
        });

        if (!paymentIntent) {
            return res.status(400).json({
                success: false,
                message: "Payment intent not found, expired or not pending",
            });
        }

        const user = await User.findById(senderId).select(
            "+faceEmbeddingEncrypted +faceEmbeddingIv +faceEmbeddingAuthTag"
        );

        if (
            !user ||
            !user.faceEnrolled ||
            !user.faceConsentGiven ||
            !user.faceConsentAt ||
            !user.faceEnrolledAt ||
            !user.faceEmbeddingEncrypted ||
            !user.faceEmbeddingIv ||
            !user.faceEmbeddingAuthTag
        ) {
            return res.status(403).json({
                success: false,
                message: "Valid biometric enrollment and consent are required",
            });
        }

        // Decrypt registered embedding
        const registeredEmbedding = decryptEmbedding({
            encryptedData: user.faceEmbeddingEncrypted,
            iv: user.faceEmbeddingIv,
            authTag: user.faceEmbeddingAuthTag,
        });

        // Generate embedding from submitted image
        const liveEmbedding = await generateFaceEmbedding(
            req.file.buffer,
            req.file.mimetype,
            req.file.originalname
        );

        // Compare embeddings
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

        // Only one verification can authorize this pending intent
        const verifiedAt = new Date();

        const updatedIntent = await PaymentIntent.findOneAndUpdate(
            {
                _id: intentId,
                senderId,
                status: "PENDING",
                expiresAt: { $gt: verifiedAt },
            },
            {
                $set: {
                    status: "VERIFIED",
                    faceVerifiedAt: verifiedAt,
                },
            },
            {
                returnDocument: "after",
            }
        );

        if (!updatedIntent) {
            return res.status(409).json({
                success: false,
                message: "Payment intent changed or expired",
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


// CONFIRM PAYMENT
const confirmPayment = async (req, res) => {
    let session;

    try {
        const senderId = req.user?._id || req.user?.id;
        const { intentId } = req.params;

        if (
            !senderId ||
            !mongoose.isValidObjectId(senderId)
        ) {
            return res.status(401).json({
                success: false,
                message: "Invalid authentication identity",
            });
        }

        if (!mongoose.isValidObjectId(intentId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid payment intent ID",
            });
        }

        session = await mongoose.startSession();

        let paymentResult = null;

        await session.withTransaction(async () => {
            const now = new Date();

            const referenceId = randomUUID();

            // Claim the verified payment intent exactly once
            const paymentIntent = await PaymentIntent.findOneAndUpdate(
                {
                    _id: intentId,
                    senderId,
                    status: "VERIFIED",
                    expiresAt: { $gt: now },
                    faceVerifiedAt: {
                        $gt: new Date(
                            now.getTime() - FACE_AUTHORIZATION_VALIDITY
                        ),
                        $lte: now,
                    },
                },
                {
                    $set: {
                        status: "COMPLETED",
                        completedAt: now,
                        referenceId,
                    },
                },
                {
                    returnDocument: "after",
                    session,
                }
            );

            if (!paymentIntent) {
                const error = new Error(
                    "Payment is not verified, expired or already processed"
                );
                error.statusCode = 400;
                throw error;
            }

            const amount = paymentIntent.amount;

            // Recheck biometric consent and debit sender atomically
            const sender = await User.findOneAndUpdate(
                {
                    _id: senderId,
                    faceEnrolled: true,
                    faceConsentGiven: true,
                    faceConsentAt: { $ne: null },
                    walletBalance: { $gte: amount },
                },
                {
                    $inc: {
                        walletBalance: -amount,
                    },
                },
                {
                    returnDocument: "after",
                    session,
                    runValidators: true,
                }
            );

            if (!sender) {
                const error = new Error(
                    "Sender consent is revoked or wallet balance is insufficient"
                );
                error.statusCode = 400;
                throw error;
            }

            // Credit receiver without allowing balance overflow
            const receiver = await User.findOneAndUpdate(
                {
                    _id: paymentIntent.receiverId,
                    walletBalance: {
                        $lte: Number.MAX_SAFE_INTEGER - amount,
                    },
                },
                {
                    $inc: {
                        walletBalance: amount,
                    },
                },
                {
                    returnDocument: "after",
                    session,
                    runValidators: true,
                }
            );

            if (!receiver) {
                const error = new Error(
                    "Receiver account not found or wallet balance limit exceeded"
                );
                error.statusCode = 409;
                throw error;
            }

            // Create sender and receiver transaction records atomically
            await WalletTransaction.create(
                [
                    {
                        userId: sender._id,
                        type: "PAYMENT",
                        amount,
                        balanceAfter: sender.walletBalance,
                        description: paymentIntent.description,
                        referenceId,
                    },
                    {
                        userId: receiver._id,
                        type: "RECEIVED",
                        amount,
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
                amount,
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
        if (session) {
            await session.endSession();
        }
    }
};


export {
    createPaymentIntent,
    verifyPaymentFace,
    confirmPayment,
};
