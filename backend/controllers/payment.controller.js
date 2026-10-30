
import mongoose from "mongoose";
import User from "../models/user.model.js";
import WalletTransaction from "../models/walletTransaction.model.js";
import crypto from "crypto";

const transferMoney = async (req, res) => {
    const { receiverBioPayId, amount, description } = req.body;

    try {
        // Validate receiver BioPay ID
        if (
            !receiverBioPayId ||
            typeof receiverBioPayId !== "string" ||
            !/^BIO[A-F0-9]{10}$/i.test(receiverBioPayId.trim())
        ) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid receiver BioPay ID",
            });
        }

        // Validate amount
        if (!Number.isSafeInteger(amount) || amount < 1 || amount > 10000) {
            return res.status(400).json({
                success: false,
                message: "Enter a whole rupee amount between 1 and 10000",
            });
        }

        // Validate optional description
        if (
            description !== undefined &&
            (typeof description !== "string" || description.length > 100)
        ) {
            return res.status(400).json({
                success: false,
                message: "Description must be a string of maximum 100 characters",
            });
        }

        const senderId = req.user.id;
        const normalizedBioPayId = receiverBioPayId.trim().toUpperCase();

        // Find receiver
        const receiver = await User.findOne({
            bioPayId: normalizedBioPayId,
        }).select("_id fullName bioPayId");

        if (!receiver) {
            return res.status(404).json({
                success: false,
                message: "Receiver BioPay account not found",
            });
        }

        if (receiver._id.toString() === senderId) {
            return res.status(400).json({
                success: false,
                message: "You cannot send money to yourself",
            });
        }

        const session = await mongoose.startSession();

        try {
            let senderNewBalance;
            let receiverNewBalance;

            const referenceId =
                "TXN" + crypto.randomBytes(8).toString("hex").toUpperCase();

            await session.withTransaction(async () => {

                // Deduct amount from sender
                const sender = await User.findOneAndUpdate(
                    {
                        _id: senderId,
                        walletBalance: { $gte: amount },
                    },
                    {
                        $inc: { walletBalance: -amount },
                    },
                    {
                        returnDocument: "after",
                        session,
                    }
                );

                if (!sender) {
                    throw new Error("INSUFFICIENT_BALANCE");
                }

                // Credit receiver
                const receiverUpdated = await User.findByIdAndUpdate(
                    receiver._id,
                    {
                        $inc: { walletBalance: amount },
                    },
                    {
                        returnDocument: "after",
                        session,
                    }
                );

                if (!receiverUpdated) {
                    throw new Error("RECEIVER_NOT_FOUND");
                }

                senderNewBalance = sender.walletBalance;
                receiverNewBalance = receiverUpdated.walletBalance;

                if (
                    !Number.isSafeInteger(senderNewBalance) ||
                    !Number.isSafeInteger(receiverNewBalance)
                ) {
                    throw new Error("INVALID_BALANCE");
                }

                // Create both transaction records
                await WalletTransaction.create(
                    [
                        {
                            userId: sender._id,
                            type: "PAYMENT",
                            amount,
                            balanceAfter: senderNewBalance,
                            description:
                                description?.trim() ||
                                `Payment to ${normalizedBioPayId}`,
                            referenceId,
                        },
                        {
                            userId: receiverUpdated._id,
                            type: "RECEIVED",
                            amount,
                            balanceAfter: receiverNewBalance,
                            description:
                                description?.trim() ||
                                `Received from ${sender.bioPayId}`,
                            referenceId,
                        },
                    ],
                    {
                        session,
                        ordered: true,
                    }
                );
            });

            return res.status(200).json({
                success: true,
                message: "Payment successful",
                transaction: {
                    referenceId,
                    receiver: {
                        fullName: receiver.fullName,
                        bioPayId: receiver.bioPayId,
                    },
                    amount,
                    currency: "INR",
                    senderBalance: senderNewBalance,
                    receiverBalance: receiverNewBalance,
                },
            });

        } finally {
            await session.endSession();
        }

    } catch (error) {
        console.error("Payment error:", error.message);

        if (error.message === "INSUFFICIENT_BALANCE") {
            return res.status(400).json({
                success: false,
                message: "Insufficient wallet balance",
            });
        }

        if (error.message === "RECEIVER_NOT_FOUND") {
            return res.status(404).json({
                success: false,
                message: "Receiver BioPay account not found",
            });
        }

        return res.status(500).json({
            success: false,
            message: "Payment failed",
        });
    }
};

export { transferMoney };
