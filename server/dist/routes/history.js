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
 *   name: History
 *   description: Bet history for the authenticated user
 */
/**
 * @swagger
 * /api/history:
 *   get:
 *     summary: Get the last 50 bets for the authenticated user
 *     tags: [History]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of past bets
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/HistoryItem'
 *       401:
 *         description: Unauthorized
 */
router.get('/', auth_1.authenticate, async (req, res) => {
    const userId = req.user?.id;
    if (!userId)
        return res.status(401).json({ message: 'Unauthorized' });
    try {
        const bets = await db_1.default.bet.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 50,
            include: {
                round: { select: { drawnNumbers: true, createdAt: true } },
            },
        });
        const result = bets.map((bet) => ({
            id: bet.id,
            amount: bet.amount,
            picks: bet.picks,
            drawnNumbers: bet.round.drawnNumbers,
            hits: bet.hits,
            payout: bet.payout,
            profit: bet.payout - bet.amount,
            createdAt: bet.createdAt,
        }));
        return res.json(result);
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Server error' });
    }
});
exports.default = router;
//# sourceMappingURL=history.js.map