
import mongoose from "mongoose";

const walletTransactionSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        type: {
            type: String,
            enum: ["TOP_UP", "PAYMENT", "RECEIVED"],
            required: true,
        },

        amount: {
            type: Number,
            required: true,
            min: 1,
            validate: {
                validator: Number.isSafeInteger,
                message: "Transaction amount must be a whole number of rupees",
            },
        },

        balanceAfter: {
            type: Number,
            required: true,
            min: 0,
            validate: {
                validator: Number.isSafeInteger,
                message: "Balance must be a whole number of rupees",
            },
        },

        description: {
            type: String,
            trim: true,
            default: "",
        },

        referenceId: {
            type: String,
            index: true,
            sparse: true,
        },
    },
    {
        timestamps: true,
    }
);

const WalletTransaction = mongoose.model(
    "WalletTransaction",
    walletTransactionSchema
);

export default WalletTransaction;
