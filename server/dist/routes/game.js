"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const db_1 = __importDefault(require("../config/db"));
const gameEngine_1 = require("../services/gameEngine");
const payoutTable_1 = require("../services/payoutTable");
const router = (0, express_1.Router)();
/**
 * @swagger
 * tags:
 *   name: Game
 *   description: Keno betting and draw results
 */
/**
 * @swagger
 * /api/game/bet:
 *   post:
 *     summary: Place a Keno bet
 *     description: |
 *       Pick 1–10 numbers from 1–80 and place a bet. The server immediately draws 20 numbers,
 *       calculates hits and payout, updates your wallet, and returns the full result.
 *
 *       **Payout multipliers (picks × hits):**
 *       | Picks | 0 hits | 1 hit | 2 hits | 3 hits | 4 hits | 5 hits | 6 hits | 7 hits | 8 hits | 9 hits | 10 hits |
 *       |-------|--------|-------|--------|--------|--------|--------|--------|--------|--------|--------|---------|
 *       | 1 | 0× | 3× | — | — | — | — | — | — | — | — | — |
 *       | 5 | 0× | 0× | 0× | 3× | 12× | 120× | — | — | — | — | — |
 *       | 10 | 0× | 0× | 0× | 0× | 0× | 2× | 20× | 100× | 500× | 10000× | 100000× |
 *     tags: [Game]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BetRequest'
 *     responses:
 *       200:
 *         description: Bet placed and result calculated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BetResponse'
 *       400:
 *         description: Invalid picks or amount, or insufficient balance
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 */
router.post('/bet', auth_1.authenticate, async (req, res) => {
    const { picks, amount } = req.body;
    const userId = req.user?.id;
    if (!userId)
        return res.status(401).json({ message: 'Unauthorized' });
    if (!Array.isArray(picks) || picks.length < 1 || picks.length > 10) {
        return res.status(400).json({ message: 'picks must be an array of 1–10 numbers' });
    }
    if (!amount || typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({ message: 'amount must be a positive number' });
    }
    const invalidPick = picks.some((p) => p < 1 || p > 80 || !Number.isInteger(p));
    if (invalidPick) {
        return res.status(400).json({ message: 'picks must be integers between 1 and 80' });
    }
    try {
        const wallet = await db_1.default.wallet.findUnique({ where: { userId } });
        if (!wallet)
            return res.status(404).json({ message: 'Wallet not found' });
        if (wallet.balance < amount) {
            return res.status(400).json({ message: 'Insufficient balance' });
        }
        const drawnNumbers = (0, gameEngine_1.drawNumbers)();
        const round = await db_1.default.gameRound.create({
            data: { drawnNumbers, status: 'COMPLETED', endedAt: new Date() },
        });
        const hits = (0, gameEngine_1.calculateHits)(picks, drawnNumbers);
        const payout = (0, payoutTable_1.calculatePayout)(picks.length, hits, amount);
        const newBalance = wallet.balance - amount + payout;
        const [bet, updatedWallet] = await db_1.default.$transaction([
            db_1.default.bet.create({ data: { amount, picks, hits, payout, userId, roundId: round.id } }),
            db_1.default.wallet.update({ where: { userId }, data: { balance: newBalance } }),
        ]);
        return res.json({
            betId: bet.id,
            roundId: round.id,
            picks,
            drawnNumbers,
            hits,
            payout,
            newBalance: updatedWallet.balance,
        });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Server error' });
    }
});
/**
 * @swagger
 * /api/game/draw:
 *   get:
 *     summary: Get the latest completed game round
 *     tags: [Game]
 *     security: []
 *     responses:
 *       200:
 *         description: Latest round details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 drawnNumbers:
 *                   type: array
 *                   items:
 *                     type: integer
 *                 status:
 *                   type: string
 *                   example: COMPLETED
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 endedAt:
 *                   type: string
 *                   format: date-time
 */
router.get('/draw', async (_req, res) => {
    try {
        const latest = await db_1.default.gameRound.findFirst({
            orderBy: { createdAt: 'desc' },
        });
        return res.json(latest ?? { message: 'No rounds yet' });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Server error' });
    }
});
exports.default = router;
//# sourceMappingURL=game.js.map