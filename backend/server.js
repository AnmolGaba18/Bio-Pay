
import dotenv from "dotenv";

dotenv.config({ path: "./backend/.env" });

import { app } from "./app.js";
import connectDB from "./config/db.js";
import mongoose from "mongoose";

const PORT = Number(process.env.PORT) || 5000;

const startServer = async () => {
    try {
        await connectDB();

        const server = app.listen(PORT, () => {
            console.log(`BioPay server running on port ${PORT}`);
        });

        // Graceful shutdown
        const shutdown = (signal) => {
            console.log(`${signal} received. Shutting down BioPay...`);

            server.close(async (error) => {
                if (error) {
                    console.error("HTTP server shutdown error:", error);
                    process.exit(1);
                }

                try {
                    await mongoose.connection.close();
                    console.log("MongoDB connection closed.");
                    process.exit(0);
                } catch (dbError) {
                    console.error(
                        "MongoDB shutdown error:",
                        dbError.message
                    );
                    process.exit(1);
                }
            });
        };

        process.on("SIGTERM", () => shutdown("SIGTERM"));
        process.on("SIGINT", () => shutdown("SIGINT"));

        server.on("error", (error) => {
            console.error("HTTP server error:", error.message);
            process.exit(1);
        });

    } catch (error) {
        console.error(
            "Server startup failed:",
            error.message
        );

        await mongoose.connection.close().catch(() => {});
        process.exit(1);
    }
};

startServer();
