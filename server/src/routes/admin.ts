// @ts-nocheck
import { Router } from 'express';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

interface BanRequestBody {
  isBanned: boolean;
  banReason?: string;
}

interface RoleRequestBody {
  role: string;
}

// Get admin statistics
router.get('/stats', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const totalUsers = await prisma.user.count();
    const activeUsers = await prisma.user.count({ where: { emailVerified: true } });
    const totalBets = await prisma.bet.count();
    const totalTransactions = await prisma.transaction.count();
    const totalRevenue = await prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { type: 'DEPOSIT' }
    });
    const totalWithdrawals = await prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { type: 'WITHDRAW' }
    });

    res.json({
      totalUsers,
      activeUsers,
      totalBets,
      totalTransactions,
      totalRevenue: totalRevenue._sum.amount || 0,
      totalWithdrawals: totalWithdrawals._sum.amount || 0,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch statistics' });
  }
});

// Get all users
router.get('/users', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        phoneNumber: true,
        emailVerified: true,
        role: true,
        isBanned: true,
        banReason: true,
        createdAt: true,
        wallet: {
          select: {
            balance: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

// Ban/Unban user
router.post('/users/:id/ban', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { isBanned, banReason } = req.body as BanRequestBody;
    const data: any = { isBanned: Boolean(isBanned) };
    if (banReason) {
      data.banReason = Array.isArray(banReason) ? banReason[0] : banReason;
    }
    // @ts-ignore
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update user ban status' });
  }
});

// Update user role
router.post('/users/:id/role', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { role } = req.body as RoleRequestBody;
    const roleStr = Array.isArray(role) ? role[0] : role;
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { role: roleStr || 'USER' } as any
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update user role' });
  }
});

// Get all transactions
router.get('/transactions', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const transactions = await prisma.transaction.findMany({
      include: {
        user: {
          select: {
            email: true,
            phoneNumber: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch transactions' });
  }
});

// Get pending withdrawals
router.get('/withdrawals/pending', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const withdrawals = await prisma.transaction.findMany({
      where: { type: 'WITHDRAW' },
      include: {
        user: {
          select: {
            email: true,
            phoneNumber: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(withdrawals);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch pending withdrawals' });
  }
});

// Get game rounds
router.get('/games', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const games = await prisma.gameRound.findMany({
      include: {
        bets: {
          include: {
            user: {
              select: {
                email: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    res.json(games);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch games' });
  }
});

// Get recent activity
router.get('/activity', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const recentBets = await prisma.bet.findMany({
      include: {
        user: {
          select: {
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });
    const recentTransactions = await prisma.transaction.findMany({
      include: {
        user: {
          select: {
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    res.json({
      bets: recentBets,
      transactions: recentTransactions
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch activity' });
  }
});

export default router;
