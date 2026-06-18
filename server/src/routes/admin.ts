// @ts-nocheck
import { Router } from 'express';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';
import { PrismaClient } from '@prisma/client';
import { sendTelegramMessageToUser, sendTelegramPhotoToUser, sendTelegramMessageToAdmins, sendTelegramPhotoToAdmins } from '../services/telegramBot';
import multer from 'multer';
import path from 'path';

const router = Router();
const prisma = new PrismaClient();

// Configure multer for photo uploads
const storage = multer.diskStorage({
  destination: (req: any, file: any, cb: any) => {
    cb(null, 'uploads/');
  },
  filename: (req: any, file: any, cb: any) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req: any, file: any, cb: any) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

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
        { phoneNumber: { contains: search as string, mode: 'insensitive' } },
        { telegramUsername: { contains: search as string, mode: 'insensitive' } }
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
          telegramUsername: true,
          telegramFirstName: true,
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
          { phoneNumber: { contains: search as string, mode: 'insensitive' } },
          { telegramUsername: { contains: search as string, mode: 'insensitive' } }
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
              phoneNumber: true,
              telegramUsername: true,
              telegramFirstName: true
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
            phoneNumber: true,
            telegramUsername: true,
            telegramFirstName: true
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
            phoneNumber: true,
            telegramUsername: true,
            telegramFirstName: true
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

    // Send notification to user
    if (transaction.user.telegramId) {
      const message = `
<b>✅ Withdrawal Approved</b>

Your withdrawal of ${transaction.amount} ETB has been approved and processed.

Thank you for using our service!
      `.trim();
      await sendTelegramMessageToUser(transaction.user.telegramId, message);
    }

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
      where: { id: req.params.id },
      include: { user: true }
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

    // Send notification to user
    if (transaction.user.telegramId) {
      const message = `
<b>❌ Withdrawal Rejected</b>

Your withdrawal of ${transaction.amount} ETB has been rejected.
${adminNote ? `Reason: ${adminNote}` : ''}

The amount has been refunded to your wallet.
      `.trim();
      await sendTelegramMessageToUser(transaction.user.telegramId, message);
    }

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

    // Check if this is the user's first deposit and they have a referrer
    const isFirstDeposit = !transaction.user.hasReceivedFirstDepositBonus;
    let referralBonus = 0;
    let referrerMessage = '';

    if (isFirstDeposit && transaction.user.referredBy) {
      // Calculate 10% referral bonus
      referralBonus = transaction.amount * 0.1;
      
      // Get referrer's wallet
      const referrer = await prisma.user.findUnique({
        where: { id: transaction.user.referredBy },
        include: { wallet: true }
      });

      if (referrer && referrer.wallet) {
        // Add bonus to referrer's wallet
        await prisma.wallet.update({
          where: { userId: referrer.id },
          data: { balance: { increment: referralBonus } }
        });

        // Create transaction for referral bonus
        await prisma.transaction.create({
          data: {
            userId: referrer.id,
            type: 'DEPOSIT',
            amount: referralBonus,
            status: 'COMPLETED',
            description: `Referral bonus from ${transaction.user.telegramUsername || transaction.user.email || 'referred user'}`
          }
        });

        // Notify referrer
        if (referrer.telegramId) {
          const bonusMessage = `
<b>🎉 Referral Bonus Received!</b>

You received ${referralBonus.toFixed(2)} ETB as a referral bonus from ${transaction.user.telegramUsername || transaction.user.email || 'a referred user'}'s first deposit.
          `.trim();
          await sendTelegramMessageToUser(referrer.telegramId, bonusMessage);
        }

        referrerMessage = `\n\nReferral bonus of ${referralBonus.toFixed(2)} ETB has been credited to your referrer.`;
      }
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
      }),
      // Mark user as having received first deposit bonus if applicable
      ...(isFirstDeposit ? [
        prisma.user.update({
          where: { id: transaction.userId },
          data: { hasReceivedFirstDepositBonus: true }
        })
      ] : [])
    ]);

    // Send notification to user
    if (transaction.user.telegramId) {
      const message = `
<b>✅ Deposit Approved</b>

Your deposit of ${transaction.amount} ETB has been approved and added to your wallet.${referrerMessage}

New balance: ${transaction.user.wallet.balance + transaction.amount} ETB

Thank you for using our service!
      `.trim();
      await sendTelegramMessageToUser(transaction.user.telegramId, message);
    }

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
      where: { id: req.params.id },
      include: { user: true }
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

    // Send notification to user
    if (transaction.user.telegramId) {
      const message = `
<b>❌ Deposit Rejected</b>

Your deposit of ${transaction.amount} ETB has been rejected.
${adminNote ? `Reason: ${adminNote}` : ''}

Please contact support if you have any questions.
      `.trim();
      await sendTelegramMessageToUser(transaction.user.telegramId, message);
    }

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
          { phoneNumber: { contains: search as string, mode: 'insensitive' } },
          { telegramUsername: { contains: search as string, mode: 'insensitive' } }
        ]
      };
    }

    const [recentBets, betsTotal] = await Promise.all([
      prisma.bet.findMany({
        where,
        include: {
          user: {
            select: {
              email: true,
              telegramUsername: true,
              telegramFirstName: true
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
              email: true,
              telegramUsername: true,
              telegramFirstName: true
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

// Send custom message to user
router.post('/send-message', authenticate, requireAdmin, upload.single('photo'), async (req: AuthRequest, res) => {
  try {
    const { userId, message } = req.body;
    const photoUrl = req.file ? `${process.env.BACKEND_URL || 'http://localhost:5000'}/uploads/${req.file.filename}` : null;

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    if (!message && !photoUrl) {
      return res.status(400).json({ message: 'Message or photo is required' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.telegramId) {
      return res.status(400).json({ message: 'User does not have Telegram linked' });
    }

    if (photoUrl) {
      await sendTelegramPhotoToUser(user.telegramId, photoUrl, message);
    } else {
      await sendTelegramMessageToUser(user.telegramId, message);
    }
    
    res.json({ message: 'Message sent successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to send message' });
  }
});

// Send broadcast message to all users
router.post('/broadcast', authenticate, requireAdmin, upload.single('photo'), async (req: AuthRequest, res) => {
  try {
    const { message } = req.body;
    const photoUrl = req.file ? `${process.env.BACKEND_URL || 'http://localhost:5000'}/uploads/${req.file.filename}` : null;

    if (!message && !photoUrl) {
      return res.status(400).json({ message: 'Message or photo is required' });
    }

    const users = await prisma.user.findMany({
      where: {
        telegramId: { not: null },
        isBanned: false,
      },
      select: {
        telegramId: true,
      },
    });

    for (const user of users) {
      if (user.telegramId) {
        if (photoUrl) {
          await sendTelegramPhotoToUser(user.telegramId, photoUrl, message);
        } else {
          await sendTelegramMessageToUser(user.telegramId, message);
        }
      }
    }

    res.json({ message: `Broadcast sent to ${users.length} users` });
  } catch (error) {
    res.status(500).json({ message: 'Failed to send broadcast' });
  }
});

export default router;
