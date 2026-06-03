import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import prisma from '../config/db';

const router = Router();

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
 */
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const bets = await prisma.bet.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        round: { select: { id: true, drawnNumbers: true, createdAt: true } },
      },
    });

    const result = bets.map((bet) => ({
      id: bet.id,
      amount: bet.amount,
      picks: bet.picks,
      roundId: bet.roundId,
      drawnNumbers: bet.round.drawnNumbers,
      hits: bet.hits,
      payout: bet.payout,
      profit: bet.payout - bet.amount,
      createdAt: bet.createdAt,
    }));

    return res.json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

export default router;
