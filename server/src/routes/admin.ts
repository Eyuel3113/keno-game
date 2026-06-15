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
    const { search, role, isBanned, page = '1', limit = '10' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    
    if (search) {
      where.OR = [
        { email: { contains: search as string, mode: 'insensitive' } },
        { phoneNumber: { contains: search as string, mode: 'insensitive' } }
      ];
    }
    
    if (role) {
      where.role = role;
    }
    
    if (isBanned !== undefined) {
      where.isBanned = isBanned === 'true';
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
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
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.user.count({ where })
    ]);
    
    res.json({ users, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) });
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
    const { search, type, page = '1', limit = '10' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    
    if (search) {
      where.user = {
        OR: [
          { email: { contains: search as string, mode: 'insensitive' } },
          { phoneNumber: { contains: search as string, mode: 'insensitive' } }
        ]
      };
    }
    
    if (type) {
      where.type = type;
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          user: {
            select: {
              email: true,
              phoneNumber: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.transaction.count({ where })
    ]);
    
    res.json({ transactions, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch transactions' });
  }
});

// Get pending withdrawals
router.get('/withdrawals/pending', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const withdrawals = await prisma.transaction.findMany({
      where: { type: 'WITHDRAW', status: 'PENDING' },
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

// Get pending deposits
router.get('/deposits/pending', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const deposits = await prisma.transaction.findMany({
      where: { type: 'DEPOSIT', status: 'PENDING' },
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
    res.json(deposits);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch pending deposits' });
  }
});

// Approve withdrawal
router.post('/withdrawals/:id/approve', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const transaction = await prisma.transaction.findUnique({
      where: { id: req.params.id },
      include: { user: { include: { wallet: true } } }
    });

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    if (transaction.status !== 'PENDING') {
      return res.status(400).json({ message: 'Transaction is not pending' });
    }

    if (transaction.type !== 'WITHDRAW') {
      return res.status(400).json({ message: 'Not a withdrawal transaction' });
    }

    // Balance already deducted when withdrawal was submitted, just update status
    await prisma.transaction.update({
      where: { id: req.params.id },
      data: { status: 'COMPLETED', updatedAt: new Date() }
    });

    res.json({ message: 'Withdrawal approved' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to approve withdrawal' });
  }
});

// Reject withdrawal
router.post('/withdrawals/:id/reject', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { adminNote } = req.body;

    const transaction = await prisma.transaction.findUnique({
      where: { id: req.params.id }
    });

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    if (transaction.status !== 'PENDING') {
      return res.status(400).json({ message: 'Transaction is not pending' });
    }

    if (transaction.type !== 'WITHDRAW') {
      return res.status(400).json({ message: 'Not a withdrawal transaction' });
    }

    // Refund amount back to wallet and update transaction status
    await prisma.$transaction([
      prisma.wallet.update({
        where: { userId: transaction.userId },
        data: { balance: { increment: transaction.amount } }
      }),
      prisma.transaction.update({
        where: { id: req.params.id },
        data: { status: 'REJECTED', adminNote, updatedAt: new Date() }
      })
    ]);

    res.json({ message: 'Withdrawal rejected, amount refunded to wallet' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to reject withdrawal' });
  }
});

// Approve deposit
router.post('/deposits/:id/approve', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const transaction = await prisma.transaction.findUnique({
      where: { id: req.params.id },
      include: { user: { include: { wallet: true } } }
    });

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    if (transaction.status !== 'PENDING') {
      return res.status(400).json({ message: 'Transaction is not pending' });
    }

    if (transaction.type !== 'DEPOSIT') {
      return res.status(400).json({ message: 'Not a deposit transaction' });
    }

    // Add balance and update transaction status
    await prisma.$transaction([
      prisma.wallet.update({
        where: { userId: transaction.userId },
        data: { balance: { increment: transaction.amount } }
      }),
      prisma.transaction.update({
        where: { id: req.params.id },
        data: { status: 'COMPLETED', updatedAt: new Date() }
      })
    ]);

    res.json({ message: 'Deposit approved' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to approve deposit' });
  }
});

// Reject deposit
router.post('/deposits/:id/reject', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { adminNote } = req.body;

    const transaction = await prisma.transaction.findUnique({
      where: { id: req.params.id }
    });

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    if (transaction.status !== 'PENDING') {
      return res.status(400).json({ message: 'Transaction is not pending' });
    }

    if (transaction.type !== 'DEPOSIT') {
      return res.status(400).json({ message: 'Not a deposit transaction' });
    }

    // Update transaction status to rejected
    await prisma.transaction.update({
      where: { id: req.params.id },
      data: { status: 'REJECTED', adminNote, updatedAt: new Date() }
    });

    res.json({ message: 'Deposit rejected' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to reject deposit' });
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
    const { search, page = '1', limit = '10' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    
    if (search) {
      where.user = {
        OR: [
          { email: { contains: search as string, mode: 'insensitive' } },
          { phoneNumber: { contains: search as string, mode: 'insensitive' } }
        ]
      };
    }

    const [recentBets, betsTotal] = await Promise.all([
      prisma.bet.findMany({
        where,
        include: {
          user: {
            select: {
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.bet.count({ where })
    ]);

    const [recentTransactions, transactionsTotal] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          user: {
            select: {
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.transaction.count({ where })
    ]);

    res.json({
      bets: recentBets,
      transactions: recentTransactions,
      betsTotal,
      transactionsTotal,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(Math.max(betsTotal, transactionsTotal) / limitNum)
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch activity' });
  }
});

export default router;
