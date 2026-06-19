"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const db_1 = __importDefault(require("../config/db"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const telegramBot_1 = require("../services/telegramBot");
const router = (0, express_1.Router)();
// Configure multer for file uploads
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path_1.default.extname(file.originalname));
    }
});
const upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const extname = allowedTypes.test(path_1.default.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        }
        else {
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
router.post('/upload', auth_1.authenticate, upload.single('file'), async (req, res) => {
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
router.post('/deposit', auth_1.authenticate, async (req, res) => {
    const userId = req.user?.id;
    const { amount, paymentMethod, paymentProof } = req.body;
    if (!userId)
        return res.status(401).json({ message: 'Unauthorized' });
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
        // Get user details for notification
        const user = await db_1.default.user.findUnique({ where: { id: userId } });
        // Create pending deposit transaction
        const transaction = await db_1.default.transaction.create({
            data: {
                userId,
                type: 'DEPOSIT',
                amount,
                status: 'PENDING',
                paymentMethod,
                paymentProof,
            },
        });
        // Send notification to admins
        const admins = await db_1.default.user.findMany({ where: { role: 'ADMIN' } });
        const adminTelegramIds = admins
            .map(admin => admin.telegramId)
            .filter((id) => id !== null);
        if (adminTelegramIds.length > 0) {
            const message = `
<b>🔔 New Deposit Request</b>

User: ${user?.telegramUsername ? `@${user.telegramUsername}` : user?.email || 'Unknown'}
Amount: ${amount} ETB
Method: ${paymentMethod}

Please review and approve in the admin dashboard.
      `.trim();
            await (0, telegramBot_1.sendTelegramMessageToAdmins)(message, adminTelegramIds);
        }
        return res.json({ transaction, message: 'Deposit request submitted. Awaiting admin approval.' });
    }
    catch (err) {
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
router.post('/withdraw', auth_1.authenticate, async (req, res) => {
    const userId = req.user?.id;
    const { amount, paymentMethod, accountNumber } = req.body;
    if (!userId)
        return res.status(401).json({ message: 'Unauthorized' });
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
        const wallet = await db_1.default.wallet.findUnique({ where: { userId } });
        if (!wallet)
            return res.status(404).json({ message: 'Wallet not found' });
        if (wallet.balance < amount) {
            return res.status(400).json({ message: 'Insufficient balance' });
        }
        // Get user details for notification
        const user = await db_1.default.user.findUnique({ where: { id: userId } });
        // Deduct balance immediately when creating pending withdrawal
        await db_1.default.wallet.update({
            where: { userId },
            data: { balance: wallet.balance - amount }
        });
        // Create pending withdrawal transaction
        const transaction = await db_1.default.transaction.create({
            data: {
                userId,
                type: 'WITHDRAW',
                amount,
                status: 'PENDING',
                paymentMethod,
                accountNumber: accountNumber.trim(),
            },
        });
        // Send notification to admins
        const admins = await db_1.default.user.findMany({ where: { role: 'ADMIN' } });
        const adminTelegramIds = admins
            .map(admin => admin.telegramId)
            .filter((id) => id !== null);
        if (adminTelegramIds.length > 0) {
            const message = `
<b>🔔 New Withdrawal Request</b>

User: ${user?.telegramUsername ? `@${user.telegramUsername}` : user?.email || 'Unknown'}
Amount: ${amount} ETB
Method: ${paymentMethod}
Account: ${accountNumber}

Please review and approve in the admin dashboard.
      `.trim();
            await (0, telegramBot_1.sendTelegramMessageToAdmins)(message, adminTelegramIds);
        }
        return res.json({ transaction, message: 'Withdrawal request submitted. Amount deducted from wallet. Awaiting admin approval (max 2 hours).' });
    }
    catch (err) {
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
router.get('/transactions', auth_1.authenticate, async (req, res) => {
    const userId = req.user?.id;
    if (!userId)
        return res.status(401).json({ message: 'Unauthorized' });
    try {
        const transactions = await db_1.default.transaction.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });
        return res.json({ transactions });
    }
    catch (err) {
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
router.post('/transfer', auth_1.authenticate, async (req, res) => {
    const senderId = req.user?.id;
    const senderEmail = req.user?.email;
    const { recipient: recipientIdentifier, amount } = req.body;
    if (!senderId)
        return res.status(401).json({ message: 'Unauthorized' });
    if (!recipientIdentifier || typeof recipientIdentifier !== 'string') {
        return res.status(400).json({ message: 'Recipient identifier is required' });
    }
    if (!amount || typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({ message: 'Amount must be a positive number' });
    }
    // Determine identifier type: phone, email, telegram username, or telegram ID
    const isPhone = !recipientIdentifier.includes('@') && /^\d+$/.test(recipientIdentifier.replace(/[^\d]/g, ''));
    const isEmail = recipientIdentifier.includes('@');
    const isTelegramUsername = recipientIdentifier.startsWith('@');
    const isTelegramId = !isPhone && !isEmail && !isTelegramUsername && /^\d+$/.test(recipientIdentifier);
    let recipient;
    let recipientLabel;
    try {
        // 1. Find recipient based on identifier type
        if (isTelegramUsername) {
            // Transfer by Telegram username
            const username = recipientIdentifier.startsWith('@') ? recipientIdentifier.slice(1) : recipientIdentifier;
            recipient = await db_1.default.user.findFirst({
                where: { telegramUsername: username },
                include: { wallet: true },
            });
            recipientLabel = `@${username}`;
        }
        else if (isTelegramId) {
            // Transfer by Telegram ID
            recipient = await db_1.default.user.findFirst({
                where: { telegramId: recipientIdentifier },
                include: { wallet: true },
            });
            recipientLabel = `Telegram ID: ${recipientIdentifier}`;
        }
        else if (isPhone) {
            // Transfer by phone number
            let cleanPhone = recipientIdentifier.replace(/[^\d]/g, '');
            if (cleanPhone.startsWith('0'))
                cleanPhone = cleanPhone.slice(1);
            if (cleanPhone.startsWith('251'))
                cleanPhone = cleanPhone.slice(3);
            if (!cleanPhone || cleanPhone.length < 9) {
                return res.status(400).json({ message: 'Invalid phone number. Must be 9 digits.' });
            }
            const formattedPhone = `+251${cleanPhone}`;
            recipient = await db_1.default.user.findUnique({
                where: { phoneNumber: formattedPhone },
                include: { wallet: true },
            });
            recipientLabel = formattedPhone;
        }
        else {
            // Transfer by email
            const normalizedEmail = recipientIdentifier.toLowerCase();
            recipient = await db_1.default.user.findUnique({
                where: { email: normalizedEmail },
                include: { wallet: true },
            });
            recipientLabel = normalizedEmail;
        }
        if (!recipient || !recipient.wallet) {
            return res.status(404).json({ message: 'Recipient not found' });
        }
        // Prevent self-transfer
        if (recipient.id === senderId) {
            return res.status(400).json({ message: 'Cannot transfer to yourself' });
        }
        // 2. Find sender wallet
        const senderWallet = await db_1.default.wallet.findUnique({ where: { userId: senderId } });
        if (!senderWallet) {
            return res.status(404).json({ message: 'Sender wallet not found' });
        }
        if (senderWallet.balance < amount) {
            return res.status(400).json({ message: 'Insufficient balance' });
        }
        // 3. Perform transfer inside transaction
        const [updatedSenderWallet] = await db_1.default.$transaction([
            // Deduct from sender
            db_1.default.wallet.update({
                where: { userId: senderId },
                data: { balance: { decrement: amount } },
            }),
            // Add to recipient
            db_1.default.wallet.update({
                where: { userId: recipient.id },
                data: { balance: { increment: amount } },
            }),
            // Create TRANSFER_SENT transaction log for sender
            db_1.default.transaction.create({
                data: {
                    userId: senderId,
                    type: 'TRANSFER_SENT',
                    amount,
                    description: `Transferred to ${recipientLabel}`,
                },
            }),
            // Create TRANSFER_RECEIVED transaction log for recipient
            db_1.default.transaction.create({
                data: {
                    userId: recipient.id,
                    type: 'TRANSFER_RECEIVED',
                    amount,
                    description: `Received from ${senderEmail || 'another user'}`,
                },
            }),
        ]);
        // Send notification to recipient via Telegram if they have a telegramId
        if (recipient.telegramId) {
            await (0, telegramBot_1.sendTelegramMessageToUser)(`💰 You received ${amount} ETB from another user!`, recipient.telegramId).catch(err => console.error('Failed to send Telegram notification:', err));
        }
        return res.json({ balance: updatedSenderWallet.balance, message: 'Transfer successful' });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Server error' });
    }
});
exports.default = router;
//# sourceMappingURL=wallet.js.map