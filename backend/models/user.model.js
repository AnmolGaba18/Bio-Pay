
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        fullName: {
            type: String,
            required: true,
            trim: true,
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },

        phone: {
            type: String,
            required: true,
            unique: true,
        },

        password: {
            type: String,
            required: true,
        },

        bioPayId: {
            type: String,
            unique: true,
            required: true,
        },

        walletBalance: {
            type: Number,
            default: 5000,
            min: 0,
            validate: {
                validator: Number.isSafeInteger,
                message: "Wallet balance must be a whole number of rupees",
            },
        },

        // Face enrollment information
        faceEnrolled: {
            type: Boolean,
            default: false,
        },

        faceEmbeddingEncrypted: {
            type: String,
            select: false,
        },

        faceEmbeddingIv: {
            type: String,
            select: false,
        },

        faceEmbeddingAuthTag: {
            type: String,
            select: false,
        },

        faceEnrolledAt: {
            type: Date,
            default: null,
        },

        // Biometric consent information
        faceConsentGiven: {
            type: Boolean,
            default: false,
        },

        faceConsentAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

const User = mongoose.model("User", userSchema);

export default User;
