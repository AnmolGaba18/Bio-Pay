
import mongoose from "mongoose";

const paymentIntentSchema = new mongoose.Schema(
    {
        senderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        receiverId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        amount: {
            type: Number,
            required: true,
            min: 1,
            validate: {
                validator: Number.isSafeInteger,
                message: "Amount must be a whole number of rupees",
            },
        },

        description: {
            type: String,
            trim: true,
            maxlength: 150,
            default: "BioPay payment",
        },

        status: {
            type: String,
            enum: [
                "PENDING",
                "VERIFIED",
                "COMPLETED",
                "EXPIRED",
                "CANCELLED",
            ],
            default: "PENDING",
            required: true,
        },

        faceVerifiedAt: {
            type: Date,
            default: null,
        },

        expiresAt: {
            type: Date,
            required: true,
        },

        completedAt: {
            type: Date,
            default: null,
        },

        referenceId: {
            type: String,
            unique: true,
            sparse: true,
        },
    },
    {
        timestamps: true,
    }
);

const PaymentIntent = mongoose.model(
    "PaymentIntent",
    paymentIntentSchema
);

export default PaymentIntent;
