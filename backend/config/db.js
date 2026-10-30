import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async () => {
  try {
    const baseURI = process.env.MONGODB_URI.replace(/\/$/, "");

    const connectionInstance = await mongoose.connect(
      `${baseURI}/${DB_NAME}`
    );

    console.log(
      `MongoDB Connected: ${connectionInstance.connection.host}`
    );

    return connectionInstance;
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    throw error;
  }
};

export default connectDB;