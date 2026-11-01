
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
            index: true,
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
            validate: {
                validator: (value) =>
                    value instanceof Date &&
                    !Number.isNaN(value.getTime()),
                message: "A valid expiry date is required",
            },
        },

        completedAt: {
            type: Date,
            default: null,
        },

        referenceId: {
            type: String,
            unique: true,
            sparse: true,
            trim: true,
        },
    },
    {
        timestamps: true,
    }
);


// Sender and receiver must be different.
paymentIntentSchema.pre("validate", function () {
    if (
        this.senderId &&
        this.receiverId &&
        this.senderId.equals(this.receiverId)
    ) {
        this.invalidate(
            "receiverId",
            "Sender and receiver cannot be the same user"
        );
    }
});


// Useful indexes for payment history and status queries.
paymentIntentSchema.index({
    senderId: 1,
    status: 1,
    createdAt: -1,
});

paymentIntentSchema.index({
    receiverId: 1,
    createdAt: -1,
});


const PaymentIntent = mongoose.model(
    "PaymentIntent",
    paymentIntentSchema
);

export default PaymentIntent;
