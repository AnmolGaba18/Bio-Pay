
import User from "../models/user.model.js";

const getReceiverDetails = async (req, res) => {
    try {
        const { bioPayId } = req.params;

        if (!bioPayId || typeof bioPayId !== "string") {
            return res.status(400).json({
                success: false,
                message: "BioPay ID is required",
            });
        }

        const normalizedBioPayId = bioPayId.trim().toUpperCase();

        if (!/^BIO[A-F0-9]{10}$/.test(normalizedBioPayId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid BioPay ID format",
            });
        }

        const receiver = await User.findOne({
            bioPayId: normalizedBioPayId,
        }).select("fullName bioPayId");

        if (!receiver) {
            return res.status(404).json({
                success: false,
                message: "Receiver BioPay account not found",
            });
        }

        if (receiver._id.toString() === req.user.id) {
            return res.status(400).json({
                success: false,
                message: "You cannot send money to yourself",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Receiver found successfully",
            receiver: {
                fullName: receiver.fullName,
                bioPayId: receiver.bioPayId,
            },
        });

    } catch (error) {
        console.error("Receiver lookup error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to find receiver",
        });
    }
};

export { getReceiverDetails };
