
import express from "express";

import verifyJWT from "../middlewares/auth.middleware.js";

import {
    transferMoney,
} from "../controllers/payment.controller.js";

const router = express.Router();

// All payment routes require authentication
router.use(verifyJWT);

// Transfer money using BioPay ID
router.post("/transfer", transferMoney);

export default router;
