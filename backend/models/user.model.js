
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
            default: 0,
            min: 0,
        },

        faceEnrolled: {
            type: Boolean,
            default: false,
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
    },
    { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User;
