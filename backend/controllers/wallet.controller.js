
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
    // Demo top-up must never be available in production.
    if (process.env.NODE_ENV === "production") {
        return res.status(403).json({
            success: false,
            message: "Demo top-up is disabled in production",
        });
    }

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

    let session;

    try {
        session = await mongoose.startSession();

        let updatedBalance;

        await session.withTransaction(async () => {
            // Atomic balance update with safe-integer protection.
            const updatedUser = await User.findOneAndUpdate(
                {
                    _id: req.user.id,
                    walletBalance: {
                        $lte: Number.MAX_SAFE_INTEGER - amount,
                    },
                },
                {
                    $inc: { walletBalance: amount },
                },
                {
                    new: true,
                    session,
                    runValidators: true,
                }
            );

            if (!updatedUser) {
                const userExists = await User.exists({
                    _id: req.user.id,
                }).session(session);

                if (!userExists) {
                    throw new Error("USER_NOT_FOUND");
                }

                throw new Error("BALANCE_LIMIT_EXCEEDED");
            }

            updatedBalance = updatedUser.walletBalance;

            await WalletTransaction.create(
                [{
                    userId: updatedUser._id,
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

        if (error.message === "BALANCE_LIMIT_EXCEEDED") {
            return res.status(409).json({
                success: false,
                message: "Wallet balance limit reached",
            });
        }

        return res.status(500).json({
            success: false,
            message: "Wallet top-up failed",
        });

    } finally {
        if (session) {
            await session.endSession();
        }
    }
};


// GET TRANSACTION HISTORY
const getTransactionHistory = async (req, res) => {
    try {
        const pageValue = req.query.page;
        const limitValue = req.query.limit;

        const page = pageValue === undefined ? 1 : Number(pageValue);
        const limit = limitValue === undefined ? 10 : Number(limitValue);

        if (
            !Number.isSafeInteger(page) ||
            page < 1 ||
            page > 1000000 ||
            !Number.isSafeInteger(limit) ||
            limit < 1 ||
            limit > 50
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid pagination parameters",
            });
        }

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
