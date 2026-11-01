
import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGODB_URI?.trim();

        if (!mongoURI) {
            throw new Error(
                "MONGODB_URI is missing from environment variables"
            );
        }

        if (
            typeof DB_NAME !== "string" ||
            !DB_NAME.trim()
        ) {
            throw new Error(
                "Invalid database name configuration"
            );
        }

        // Validate MongoDB connection URI.
        let parsedURI;

        try {
            parsedURI = new URL(mongoURI);
        } catch {
            throw new Error("Invalid MongoDB connection URI");
        }

        if (
            parsedURI.protocol !== "mongodb:" &&
            parsedURI.protocol !== "mongodb+srv:"
        ) {
            throw new Error(
                "Invalid MongoDB connection URI protocol"
            );
        }

        const connectionInstance = await mongoose.connect(
            mongoURI,
            {
                dbName: DB_NAME,
                serverSelectionTimeoutMS: 10000,
                maxPoolSize: 10,
            }
        );

        console.log(
            `MongoDB Connected: ${connectionInstance.connection.host}`
        );

        console.log(
            `Database: ${connectionInstance.connection.name}`
        );

        return connectionInstance;

    } catch (error) {
        console.error(
            "MongoDB connection failed:",
            error.message
        );

        throw error;
    }
};

export default connectDB;
