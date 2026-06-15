import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import prisma from '../config/db';
import multer from 'multer';
import path from 'path';

const router = Router();

// Configure multer for file uploads
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
router.get('/balance', authenticate, async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const wallet = await prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) return res.status(404).json({ message: 'Wallet not found' });
    return res.json({ balance: wallet.balance });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/wallet/upload:
 *   post:
 *     summary: Upload payment proof image
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: File uploaded successfully
 */
router.post('/upload', authenticate, upload.single('file'), async (req: AuthRequest, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({ fileUrl });
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
router.post('/deposit', authenticate, async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const { amount, paymentMethod, paymentProof } = req.body;

  if (!userId) return res.status(401).json({ message: 'Unauthorized' });
  if (!amount || typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ message: 'Amount must be a positive number' });
  }
  if (!paymentMethod || !['CBE', 'TELEBIRR'].includes(paymentMethod)) {
    return res.status(400).json({ message: 'Payment method is required (CBE or TELEBIRR)' });
  }
  if (!paymentProof) {
    return res.status(400).json({ message: 'Payment proof is required' });
  }

  try {
    // Create pending deposit transaction
    const transaction = await prisma.transaction.create({
      data: {
        userId,
        type: 'DEPOSIT',
        amount,
        status: 'PENDING',
        paymentMethod,
        paymentProof,
      },
    });
    return res.json({ transaction, message: 'Deposit request submitted. Awaiting admin approval.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/wallet/withdraw:
 *   post:
 *     summary: Withdraw chips from the wallet
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
 *                 example: 200
 *     responses:
 *       200:
 *         description: Withdrawal successful, returns new balance
 *       400:
 *         description: Invalid amount or insufficient balance
 *       401:
 *         description: Unauthorized
 */
router.post('/withdraw', authenticate, async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const { amount, paymentMethod, accountNumber } = req.body;

  if (!userId) return res.status(401).json({ message: 'Unauthorized' });
  if (!amount || typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ message: 'Amount must be a positive number' });
  }
  if (!paymentMethod || !['CBE', 'TELEBIRR'].includes(paymentMethod)) {
    return res.status(400).json({ message: 'Payment method is required (CBE or TELEBIRR)' });
  }
  if (!accountNumber || !accountNumber.trim()) {
    return res.status(400).json({ message: 'Account number is required' });
  }

  try {
    const wallet = await prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) return res.status(404).json({ message: 'Wallet not found' });
    if (wallet.balance < amount) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    // Deduct balance immediately when creating pending withdrawal
    await prisma.wallet.update({
      where: { userId },
      data: { balance: wallet.balance - amount }
    });

    // Create pending withdrawal transaction
    const transaction = await prisma.transaction.create({
      data: {
        userId,
        type: 'WITHDRAW',
        amount,
        status: 'PENDING',
        paymentMethod,
        accountNumber: accountNumber.trim(),
      },
    });
    return res.json({ transaction, message: 'Withdrawal request submitted. Amount deducted from wallet. Awaiting admin approval (max 2 hours).' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/wallet/transactions:
 *   get:
 *     summary: Get the user's transaction history
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of transactions
 */
router.get('/transactions', authenticate, async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const transactions = await prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return res.json({ transactions });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/wallet/transfer:
 *   post:
 *     summary: Transfer chips to another user via email
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [recipientEmail, amount]
 *             properties:
 *               recipientEmail:
 *                 type: string
 *                 example: friend@example.com
 *               amount:
 *                 type: number
 *                 minimum: 1
 *                 example: 100
 *     responses:
 *       200:
 *         description: Transfer successful
 *       400:
 *         description: Invalid input or insufficient balance
 *       404:
 *         description: Recipient not found
 */
router.post('/transfer', authenticate, async (req: AuthRequest, res: Response) => {
  const senderId = req.user?.id;
  const senderEmail = req.user?.email;
  const { recipient: recipientIdentifier, amount } = req.body;

  if (!senderId) return res.status(401).json({ message: 'Unauthorized' });

  if (!recipientIdentifier || typeof recipientIdentifier !== 'string') {
    return res.status(400).json({ message: 'Recipient email or phone is required' });
  }

  if (!amount || typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ message: 'Amount must be a positive number' });
  }

  // Determine if identifier is a phone number or email
  const isPhone = !recipientIdentifier.includes('@');
  let lookupKey: { email: string } | { phoneNumber: string };

  if (isPhone) {
    // Format Ethiopian phone number
    let cleanPhone = recipientIdentifier.replace(/[^\d]/g, '');
    if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.slice(1);
    if (cleanPhone.startsWith('251')) cleanPhone = cleanPhone.slice(3);
    if (!cleanPhone || cleanPhone.length < 9) {
      return res.status(400).json({ message: 'Invalid phone number. Must be 9 digits.' });
    }
    const formattedPhone = `+251${cleanPhone}`;

    // Prevent self-transfer by phone
    const senderUser = await prisma.user.findUnique({ where: { id: senderId } });
    if (senderUser?.phoneNumber === formattedPhone) {
      return res.status(400).json({ message: 'Cannot transfer to yourself' });
    }

    lookupKey = { phoneNumber: formattedPhone };
  } else {
    const normalizedEmail = recipientIdentifier.toLowerCase();
    if (senderEmail && senderEmail.toLowerCase() === normalizedEmail) {
      return res.status(400).json({ message: 'Cannot transfer to yourself' });
    }
    lookupKey = { email: normalizedEmail };
  }

  try {
    // 1. Find recipient
    const recipient = await prisma.user.findUnique({
      where: lookupKey,
      include: { wallet: true },
    });

    if (!recipient || !recipient.wallet) {
      return res.status(404).json({ message: 'Recipient not found' });
    }

    // 2. Find sender wallet
    const senderWallet = await prisma.wallet.findUnique({ where: { userId: senderId } });
    if (!senderWallet) {
      return res.status(404).json({ message: 'Sender wallet not found' });
    }

    if (senderWallet.balance < amount) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    const recipientLabel = recipient.email;

    // 3. Perform transfer inside transaction
    const [updatedSenderWallet] = await prisma.$transaction([
      // Deduct from sender
      prisma.wallet.update({
        where: { userId: senderId },
        data: { balance: { decrement: amount } },
      }),
      // Add to recipient
      prisma.wallet.update({
        where: { userId: recipient.id },
        data: { balance: { increment: amount } },
      }),
      // Create TRANSFER_SENT transaction log for sender
      prisma.transaction.create({
        data: {
          userId: senderId,
          type: 'TRANSFER_SENT',
          amount,
          description: `Transferred to ${recipientLabel}`,
        },
      }),
      // Create TRANSFER_RECEIVED transaction log for recipient
      prisma.transaction.create({
        data: {
          userId: recipient.id,
          type: 'TRANSFER_RECEIVED',
          amount,
          description: `Received from ${senderEmail || 'another user'}`,
        },
      }),
    ]);

    return res.json({ balance: updatedSenderWallet.balance, message: 'Transfer successful' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

export default router;
