"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const db_1 = __importDefault(require("../config/db"));
const router = (0, express_1.Router)();
/**
 * @swagger
 * tags:
 *   name: Wallet
 *   description: Chip balance and deposits
 */
/**
 * @swagger
 * /api/wallet/balance:
 *   get:
 *     summary: Get the authenticated user's chip balance
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current balance
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 balance:
 *                   type: number
 *                   example: 1000
 *       401:
 *         description: Unauthorized — missing or invalid JWT
 */
router.get('/balance', auth_1.authenticate, async (req, res) => {
    const userId = req.user?.id;
    if (!userId)
        return res.status(401).json({ message: 'Unauthorized' });
    try {
        const wallet = await db_1.default.wallet.findUnique({ where: { userId } });
        if (!wallet)
            return res.status(404).json({ message: 'Wallet not found' });
        return res.json({ balance: wallet.balance });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Server error' });
    }
});
/**
 * @swagger
 * /api/wallet/deposit:
 *   post:
 *     summary: Deposit chips into the wallet
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount]
 *             properties:
 *               amount:
 *                 type: number
 *                 minimum: 1
 *                 example: 500
 *     responses:
 *       200:
 *         description: Deposit successful, returns new balance
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 balance:
 *                   type: number
 *                   example: 1500
 *       400:
 *         description: Invalid amount
 *       401:
 *         description: Unauthorized
 */
router.post('/deposit', auth_1.authenticate, async (req, res) => {
    const userId = req.user?.id;
    const { amount } = req.body;
    if (!userId)
        return res.status(401).json({ message: 'Unauthorized' });
    if (!amount || typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({ message: 'Amount must be a positive number' });
    }
    try {
        const wallet = await db_1.default.wallet.update({
            where: { userId },
            data: { balance: { increment: amount } },
        });
        return res.json({ balance: wallet.balance });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Server error' });
    }
});
exports.default = router;
//# sourceMappingURL=wallet.js.map