
import mongoose from "mongoose";
import User from "../models/user.model.js";
import WalletTransaction from "../models/walletTransaction.model.js";

// GET WALLET BALANCE
const getWalletBalance = async (req, res) => {
    try {
        const user = await User.findById(req.user.id)
            .select("walletBalance bioPayId");

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        return res.status(200).json({
            success: true,
            wallet: {
                bioPayId: user.bioPayId,
                balance: user.walletBalance,
                currency: "INR",
            },
        });

    } catch (error) {
        console.error("Wallet balance error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to fetch wallet balance",
        });
    }
};


// DEMO WALLET TOP-UP
const demoTopUp = async (req, res) => {
    const { amount } = req.body;

    if (
        !Number.isSafeInteger(amount) ||
        amount < 1 ||
        amount > 10000
    ) {
        return res.status(400).json({
            success: false,
            message: "Enter a whole rupee amount between 1 and 10000",
        });
    }

    const session = await mongoose.startSession();

    try {
        let updatedBalance;

        await session.withTransaction(async () => {
            const user = await User.findById(req.user.id)
                .session(session);

            if (!user) {
                throw new Error("USER_NOT_FOUND");
            }

            const newBalance = user.walletBalance + amount;

            if (!Number.isSafeInteger(newBalance)) {
                throw new Error("INVALID_BALANCE");
            }

            const updatedUser = await User.findByIdAndUpdate(
                req.user.id,
                { $inc: { walletBalance: amount } },
                { new: true, session }
            );

            updatedBalance = updatedUser.walletBalance;

            await WalletTransaction.create(
                [{
                    userId: user._id,
                    type: "TOP_UP",
                    amount,
                    balanceAfter: updatedBalance,
                    description: "BioPay demo wallet top-up",
                }],
                { session }
            );
        });

        return res.status(200).json({
            success: true,
            message: "Demo wallet top-up successful",
            addedAmount: amount,
            walletBalance: updatedBalance,
            currency: "INR",
        });

    } catch (error) {
        console.error("Wallet top-up error:", error.message);

        if (error.message === "USER_NOT_FOUND") {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        return res.status(500).json({
            success: false,
            message: "Wallet top-up failed",
        });

    } finally {
        await session.endSession();
    }
};


// GET TRANSACTION HISTORY
const getTransactionHistory = async (req, res) => {
    try {
        const page = Math.max(
            1,
            Number.parseInt(req.query.page, 10) || 1
        );

        const limit = Math.min(
            50,
            Math.max(
                1,
                Number.parseInt(req.query.limit, 10) || 10
            )
        );

        const skip = (page - 1) * limit;

        const filter = {
            userId: req.user.id,
        };

        const [transactions, total] = await Promise.all([
            WalletTransaction.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),

            WalletTransaction.countDocuments(filter),
        ]);

        return res.status(200).json({
            success: true,
            transactions,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });

    } catch (error) {
        console.error("Transaction history error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to fetch transaction history",
        });
    }
};


export {
    getWalletBalance,
    demoTopUp,
    getTransactionHistory,
};
