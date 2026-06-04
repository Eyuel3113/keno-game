"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const db_1 = __importDefault(require("../config/db"));
const gameSocket_1 = require("../socket/gameSocket");
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
 *     description: Pick 1–10 numbers from 1–80 and place a bet on the current active round.
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
 *         description: Bet placed successfully on current active round
 *       400:
 *         description: Invalid picks or amount, or insufficient balance
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
    const roundId = req.body.roundId || (0, gameSocket_1.getCurrentRoundId)();
    if (!roundId) {
        return res.status(400).json({ message: 'No active game round at the moment' });
    }
    try {
        const wallet = await db_1.default.wallet.findUnique({ where: { userId } });
        if (!wallet)
            return res.status(404).json({ message: 'Wallet not found' });
        if (wallet.balance < amount) {
            return res.status(400).json({ message: 'Insufficient balance' });
        }
        const round = await db_1.default.gameRound.findUnique({ where: { id: roundId } });
        if (!round) {
            return res.status(404).json({ message: 'Active game round not found' });
        }
        if (round.status !== 'PENDING') {
            return res.status(400).json({ message: 'Betting is closed for this round' });
        }
        const newBalance = wallet.balance - amount;
        const [bet, updatedWallet] = await db_1.default.$transaction([
            db_1.default.bet.create({
                data: {
                    amount,
                    picks,
                    userId,
                    roundId,
                    hits: 0,
                    payout: 0,
                },
            }),
            db_1.default.wallet.update({ where: { userId }, data: { balance: newBalance } }),
        ]);
        return res.json({
            betId: bet.id,
            roundId,
            picks,
            newBalance: updatedWallet.balance,
            balance: updatedWallet.balance,
            payout: 0,
            hits: 0,
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