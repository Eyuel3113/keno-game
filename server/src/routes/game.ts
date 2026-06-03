import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import prisma from '../config/db';
import { drawNumbers, calculateHits } from '../services/gameEngine';
import { calculatePayout } from '../services/payoutTable';
import { getCurrentRoundId } from '../socket/gameSocket';

const router = Router();

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
router.post('/bet', authenticate, async (req: AuthRequest, res: Response) => {
  const { picks, amount } = req.body;
  const userId = req.user?.id;

  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  if (!Array.isArray(picks) || picks.length < 1 || picks.length > 10) {
    return res.status(400).json({ message: 'picks must be an array of 1–10 numbers' });
  }
  if (!amount || typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ message: 'amount must be a positive number' });
  }
  const invalidPick = picks.some((p: number) => p < 1 || p > 80 || !Number.isInteger(p));
  if (invalidPick) {
    return res.status(400).json({ message: 'picks must be integers between 1 and 80' });
  }

  const roundId = req.body.roundId || getCurrentRoundId();
  if (!roundId) {
    return res.status(400).json({ message: 'No active game round at the moment' });
  }

  try {
    const wallet = await prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) return res.status(404).json({ message: 'Wallet not found' });
    if (wallet.balance < amount) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    const round = await prisma.gameRound.findUnique({ where: { id: roundId } });
    if (!round) {
      return res.status(404).json({ message: 'Active game round not found' });
    }
    if (round.status !== 'PENDING') {
      return res.status(400).json({ message: 'Betting is closed for this round' });
    }

    const newBalance = wallet.balance - amount;

    const [bet, updatedWallet] = await prisma.$transaction([
      prisma.bet.create({
        data: {
          amount,
          picks,
          userId,
          roundId,
          hits: 0,
          payout: 0,
        },
      }),
      prisma.wallet.update({ where: { userId }, data: { balance: newBalance } }),
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
  } catch (err) {
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
router.get('/draw', async (_req, res: Response) => {
  try {
    const latest = await prisma.gameRound.findFirst({
      orderBy: { createdAt: 'desc' },
    });
    return res.json(latest ?? { message: 'No rounds yet' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

export default router;
