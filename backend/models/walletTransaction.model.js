
import mongoose from "mongoose";

const walletTransactionSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
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
            maxlength: 150,
            default: "",
        },

        referenceId: {
            type: String,
            trim: true,
            index: true,
            sparse: true,
        },
    },
    {
        timestamps: true,
    }
);


// Efficient transaction history retrieval.
walletTransactionSchema.index({
    userId: 1,
    createdAt: -1,
});


const WalletTransaction = mongoose.model(
    "WalletTransaction",
    walletTransactionSchema
);

export default WalletTransaction;
