
import express from "express";
import verifyJWT from "../middlewares/auth.middleware.js";

import {
    getWalletBalance,
    demoTopUp,
    getTransactionHistory,
} from "../controllers/wallet.controller.js";

const router = express.Router();

router.use(verifyJWT);

router.get("/balance", getWalletBalance);
router.post("/demo-topup", demoTopUp);
router.get("/transactions", getTransactionHistory);

export default router;
