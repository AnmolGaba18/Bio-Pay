
import express from "express";

import verifyJWT from "../middlewares/auth.middleware.js";
import { getReceiverDetails } from "../controllers/receiver.controller.js";

const router = express.Router();

// All receiver routes require authentication
router.use(verifyJWT);

// Find receiver using BioPay ID
router.get("/:bioPayId", getReceiverDetails);

export default router;
