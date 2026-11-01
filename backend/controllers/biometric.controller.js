
import mongoose from "mongoose";

import User from "../models/user.model.js";

import { generateFaceEmbedding } from "../services/biometric.service.js";

import {
    encryptEmbedding,
    decryptEmbedding,
} from "../services/encryption.service.js";

// Provisional demo threshold. Requires proper calibration.
const FACE_MATCH_THRESHOLD = 0.70;


// GET AUTHENTICATED USER ID
const getAuthenticatedUserId = (req) => {
    const userId = req.user?._id || req.user?.id;

    if (!userId || !mongoose.isValidObjectId(userId)) {
        return null;
    }

    return userId;
};


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


// ENROLL FACE WITH EXPLICIT CONSENT
const enrollFace = async (req, res) => {
    try {
        const userId = getAuthenticatedUserId(req);

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Invalid authentication identity",
            });
        }

        // Require explicit consent
        if (
            req.body.consent !== "true" &&
            req.body.consent !== true
        ) {
            return res.status(400).json({
                success: false,
                message: "Biometric consent is required before enrollment",
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Face image is required",
            });
        }

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User account not found",
            });
        }

        // Generate face embedding
        const embedding = await generateFaceEmbedding(
            req.file.buffer,
            req.file.mimetype,
            req.file.originalname
        );

        if (
            !Array.isArray(embedding) ||
            embedding.length !== 512 ||
            !embedding.every(
                (value) =>
                    typeof value === "number" &&
                    Number.isFinite(value)
            )
        ) {
            throw new Error("Biometric service returned an invalid embedding");
        }

        // Encrypt embedding before database storage
        const encryptedData = encryptEmbedding(embedding);

        const enrolledAt = new Date();

        // Update only the authenticated user's biometric data
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            {
                $set: {
                    faceEmbeddingEncrypted: encryptedData.encryptedData,
                    faceEmbeddingIv: encryptedData.iv,
                    faceEmbeddingAuthTag: encryptedData.authTag,

                    faceEnrolled: true,
                    faceEnrolledAt: enrolledAt,

                    faceConsentGiven: true,
                    faceConsentAt: enrolledAt,
                },
            },
            {
                new: true,
                runValidators: true,
            }
        );

        if (!updatedUser) {
            return res.status(404).json({
                success: false,
                message: "User account not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Face enrolled successfully with biometric consent",
            biometric: {
                faceEnrolled: true,
                consentGiven: true,
                enrolledAt: updatedUser.faceEnrolledAt,
            },
        });

    } catch (error) {
        console.error("Face enrollment error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Face enrollment failed",
        });
    }
};


// VERIFY ENROLLED FACE
const verifyFace = async (req, res) => {
    try {
        const userId = getAuthenticatedUserId(req);

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Invalid authentication identity",
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Face image is required",
            });
        }

        const user = await User.findById(userId).select(
            "+faceEmbeddingEncrypted +faceEmbeddingIv +faceEmbeddingAuthTag"
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User account not found",
            });
        }

        // Check current enrollment and consent
        if (
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
                message: "Face enrollment or biometric consent not found",
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

        const isMatch = similarity >= FACE_MATCH_THRESHOLD;

        return res.status(200).json({
            success: true,
            message: isMatch
                ? "Face verification successful"
                : "Face verification failed",
            biometric: {
                verified: isMatch,
                similarity: Number(similarity.toFixed(4)),
            },
        });

    } catch (error) {
        console.error("Face verification error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Face verification could not be completed",
        });
    }
};


// DELETE ENROLLED FACE DATA AND REVOKE CONSENT
const deleteFaceEnrollment = async (req, res) => {
    try {
        const userId = getAuthenticatedUserId(req);

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Invalid authentication identity",
            });
        }

        // Remove encrypted embedding and revoke consent atomically
        const user = await User.findByIdAndUpdate(
            userId,
            {
                $unset: {
                    faceEmbeddingEncrypted: "",
                    faceEmbeddingIv: "",
                    faceEmbeddingAuthTag: "",
                },
                $set: {
                    faceEnrolled: false,
                    faceEnrolledAt: null,
                    faceConsentGiven: false,
                    faceConsentAt: null,
                },
            },
            {
                new: true,
                runValidators: true,
            }
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User account not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Face enrollment deleted and biometric consent revoked",
            biometric: {
                faceEnrolled: false,
                consentGiven: false,
            },
        });

    } catch (error) {
        console.error("Face deletion error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to delete face enrollment",
        });
    }
};


export {
    enrollFace,
    verifyFace,
    deleteFaceEnrollment,
};
