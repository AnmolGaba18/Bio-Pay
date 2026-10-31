
import User from "../models/user.model.js";

import { generateFaceEmbedding } from "../services/biometric.service.js";
import {
    encryptEmbedding,
    decryptEmbedding,
} from "../services/encryption.service.js";

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

// ENROLL FACE WITH EXPLICIT CONSENT
const enrollFace = async (req, res) => {
    try {
        const userId = req.user.id;

        if (req.body.consent !== "true" && req.body.consent !== true) {
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

        const embedding = await generateFaceEmbedding(
            req.file.buffer,
            req.file.mimetype,
            req.file.originalname
        );

        const encryptedData = encryptEmbedding(embedding);

        user.faceEmbeddingEncrypted = encryptedData.encryptedData;
        user.faceEmbeddingIv = encryptedData.iv;
        user.faceEmbeddingAuthTag = encryptedData.authTag;

        user.faceEnrolled = true;
        user.faceEnrolledAt = new Date();

        user.faceConsentGiven = true;
        user.faceConsentAt = new Date();

        await user.save();

        return res.status(200).json({
            success: true,
            message: "Face enrolled successfully with biometric consent",
            biometric: {
                faceEnrolled: true,
                consentGiven: true,
                enrolledAt: user.faceEnrolledAt,
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
        const userId = req.user.id;

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

        if (
            !user.faceEnrolled ||
            !user.faceConsentGiven ||
            !user.faceEmbeddingEncrypted ||
            !user.faceEmbeddingIv ||
            !user.faceEmbeddingAuthTag
        ) {
            return res.status(400).json({
                success: false,
                message: "Face enrollment or biometric consent not found",
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
        const userId = req.user.id;

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User account not found",
            });
        }

        user.faceEmbeddingEncrypted = undefined;
        user.faceEmbeddingIv = undefined;
        user.faceEmbeddingAuthTag = undefined;

        user.faceEnrolled = false;
        user.faceEnrolledAt = null;

        user.faceConsentGiven = false;
        user.faceConsentAt = null;

        await user.save();

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
