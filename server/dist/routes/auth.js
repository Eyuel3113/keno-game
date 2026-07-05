"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const db_1 = __importDefault(require("../config/db"));
const emailService_1 = require("../services/emailService");
const referral_1 = require("../utils/referral");
const router = (0, express_1.Router)();
// In-memory store for referral tokens (in production, use Redis or database)
const referralTokenStore = new Map();
// Clean up expired tokens (older than 1 hour)
setInterval(() => {
    const now = Date.now();
    for (const [token, data] of referralTokenStore.entries()) {
        if (now - data.createdAt > 3600000) { // 1 hour
            referralTokenStore.delete(token);
        }
    }
}, 300000); // Check every 5 minutes
function formatEthiopianPhoneNumber(phone) {
    let clean = phone.replace(/[^\d+]/g, '');
    if (clean.startsWith('0')) {
        clean = '+251' + clean.slice(1);
    }
    else if (clean.startsWith('251') && !clean.startsWith('+')) {
        clean = '+' + clean;
    }
    else if (!clean.startsWith('+') && /^[79]/.test(clean)) {
        clean = '+251' + clean;
    }
    return clean;
}
// ─── Register ─────────────────────────────────────────────────────────────────
router.post('/register', async (req, res) => {
    const { email, password, phoneNumber, referralCode } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }
    try {
        const existing = await db_1.default.user.findUnique({ where: { email } });
        if (existing) {
            return res.status(409).json({ message: 'User already exists' });
        }
        let formattedPhone = null;
        if (phoneNumber) {
            formattedPhone = formatEthiopianPhoneNumber(phoneNumber);
            const existingPhone = await db_1.default.user.findUnique({ where: { phoneNumber: formattedPhone } });
            if (existingPhone) {
                return res.status(409).json({ message: 'Phone number already registered' });
            }
        }
        // Validate referral code if provided
        let referredBy = null;
        if (referralCode) {
            const referrer = await (0, referral_1.validateReferralCode)(referralCode);
            if (!referrer) {
                return res.status(400).json({ message: 'Invalid referral code' });
            }
            referredBy = referrer.id;
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        const verifyToken = crypto_1.default.randomBytes(32).toString('hex');
        const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        const newUser = await db_1.default.user.create({
            data: {
                email,
                phoneNumber: formattedPhone,
                password: hashedPassword,
                verifyToken,
                verifyExpires,
                referredBy,
                wallet: { create: { balance: 0 } },
            },
        });
        // Generate referral code for the new user
        await (0, referral_1.assignReferralCode)(newUser.id);
        // Send verification email (non-blocking — don't fail registration if email fails)
        (0, emailService_1.sendVerificationEmail)(email, verifyToken).catch((err) => console.error('[Email] Failed to send verification email:', err));
        return res.status(201).json({
            message: 'Registration successful. Please check your email to verify your account.',
        });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Server error' });
    }
});
// ─── Login ────────────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
    const { email, identifier, password } = req.body;
    const loginId = identifier || email;
    if (!loginId || !password) {
        return res.status(400).json({ message: 'Identifier and password are required' });
    }
    try {
        let queryCond = { email: loginId };
        if (!loginId.includes('@')) {
            const formattedPhone = formatEthiopianPhoneNumber(loginId);
            queryCond = { phoneNumber: formattedPhone };
        }
        const user = await db_1.default.user.findFirst({
            where: queryCond,
            include: { wallet: true },
        });
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        if (!user.password) {
            return res.status(401).json({ message: 'Please use Telegram authentication' });
        }
        const isMatch = await bcryptjs_1.default.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        if (!user.emailVerified) {
            return res.status(403).json({
                message: 'Please verify your email before signing in. Check your inbox for the verification link.',
            });
        }
        const token = jsonwebtoken_1.default.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
        return res.json({
            token,
            user: { id: user.id, email: user.email, phoneNumber: user.phoneNumber, balance: user.wallet?.balance, role: user.role },
        });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Server error' });
    }
});
// ─── Verify Email ─────────────────────────────────────────────────────────────
router.get('/verify-email', async (req, res) => {
    const { token } = req.query;
    if (!token || typeof token !== 'string') {
        return res.status(400).json({ message: 'Invalid token' });
    }
    try {
        const user = await db_1.default.user.findFirst({
            where: { verifyToken: token },
        });
        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired verification link.' });
        }
        if (user.verifyExpires && user.verifyExpires < new Date()) {
            return res.status(400).json({ message: 'Verification link has expired. Please register again.' });
        }
        await db_1.default.user.update({
            where: { id: user.id },
            data: {
                emailVerified: true,
                verifyToken: null,
                verifyExpires: null,
            },
        });
        return res.json({ message: 'Email verified successfully! You can now sign in.' });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Server error' });
    }
});
// ─── Forgot Password ──────────────────────────────────────────────────────────
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ message: 'Email is required' });
    }
    // Always return 200 to avoid revealing which emails are registered
    const SAFE_RESPONSE = { message: 'If that email is registered, a reset link has been sent.' };
    try {
        const user = await db_1.default.user.findUnique({ where: { email } });
        if (!user) {
            return res.json(SAFE_RESPONSE);
        }
        const resetToken = crypto_1.default.randomBytes(32).toString('hex');
        const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
        await db_1.default.user.update({
            where: { id: user.id },
            data: { resetToken, resetExpires },
        });
        (0, emailService_1.sendPasswordResetEmail)(email, resetToken).catch((err) => console.error('[Email] Failed to send reset email:', err));
        return res.json(SAFE_RESPONSE);
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Server error' });
    }
});
// ─── Reset Password ───────────────────────────────────────────────────────────
router.post('/reset-password', async (req, res) => {
    const { token, password } = req.body;
    if (!token || !password) {
        return res.status(400).json({ message: 'Token and new password are required' });
    }
    if (password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }
    try {
        const user = await db_1.default.user.findFirst({ where: { resetToken: token } });
        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired reset link.' });
        }
        if (user.resetExpires && user.resetExpires < new Date()) {
            return res.status(400).json({ message: 'Reset link has expired. Please request a new one.' });
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        await db_1.default.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                resetToken: null,
                resetExpires: null,
            },
        });
        return res.json({ message: 'Password reset successfully! You can now sign in.' });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Server error' });
    }
});
// ─── Resend Verification Email ────────────────────────────────────────────────
router.post('/resend-verification', async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ message: 'Email is required' });
    }
    try {
        const user = await db_1.default.user.findUnique({ where: { email } });
        if (!user || user.emailVerified) {
            // Don't reveal details
            return res.json({ message: 'If that account exists and is unverified, a new link has been sent.' });
        }
        const verifyToken = crypto_1.default.randomBytes(32).toString('hex');
        const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await db_1.default.user.update({
            where: { id: user.id },
            data: { verifyToken, verifyExpires },
        });
        (0, emailService_1.sendVerificationEmail)(email, verifyToken).catch((err) => console.error('[Email] Failed to resend verification email:', err));
        return res.json({ message: 'If that account exists and is unverified, a new link has been sent.' });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Server error' });
    }
});
// ─── Change Email ─────────────────────────────────────────────────────────────
router.post('/change-email', auth_1.authenticate, async (req, res) => {
    const userId = req.user?.id;
    const { currentPassword, newEmail } = req.body;
    if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    if (!currentPassword || !newEmail) {
        return res.status(400).json({ message: 'Current password and new email are required' });
    }
    try {
        const user = await db_1.default.user.findUnique({ where: { id: userId } });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (!user.password) {
            return res.status(400).json({ message: 'Cannot change email for Telegram users' });
        }
        const isMatch = await bcryptjs_1.default.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid current password' });
        }
        const existing = await db_1.default.user.findUnique({ where: { email: newEmail } });
        if (existing) {
            return res.status(409).json({ message: 'Email already in use' });
        }
        const verifyToken = crypto_1.default.randomBytes(32).toString('hex');
        const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        await db_1.default.user.update({
            where: { id: userId },
            data: {
                email: newEmail,
                emailVerified: false,
                verifyToken,
                verifyExpires,
            },
        });
        (0, emailService_1.sendVerificationEmail)(newEmail, verifyToken).catch((err) => console.error('[Email] Failed to send verification email for email change:', err));
        return res.json({ message: 'Email updated successfully. Please check your new email to verify it.' });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Server error' });
    }
});
// ─── Change Password ──────────────────────────────────────────────────────────
router.post('/change-password', auth_1.authenticate, async (req, res) => {
    const userId = req.user?.id;
    const { currentPassword, newPassword } = req.body;
    if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: 'Current password and new password are required' });
    }
    if (newPassword.length < 6) {
        return res.status(400).json({ message: 'New password must be at least 6 characters long' });
    }
    try {
        const user = await db_1.default.user.findUnique({ where: { id: userId } });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (!user.password) {
            return res.status(400).json({ message: 'Cannot change password for Telegram users' });
        }
        const isMatch = await bcryptjs_1.default.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid current password' });
        }
        const hashedPassword = await bcryptjs_1.default.hash(newPassword, 10);
        await db_1.default.user.update({
            where: { id: userId },
            data: {
                password: hashedPassword,
            },
        });
        return res.json({ message: 'Password changed successfully.' });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Server error' });
    }
});
// ─── Telegram Authentication ───────────────────────────────────────────────────
router.post('/telegram', async (req, res) => {
    console.log('[Telegram Auth] Request received:', JSON.stringify(req.body, null, 2));
    const { initData, user } = req.body;
    if (!user || !user.id) {
        console.log('[Telegram Auth] Missing user data');
        return res.status(400).json({ message: 'Telegram user data is required' });
    }
    try {
        console.log('[Telegram Auth] Processing user:', user.id);
        // For development, we'll skip the init data verification
        // In production, you should verify the initData using the bot token
        // const botToken = process.env.TELEGRAM_BOT_TOKEN;
        // Verify initData here...
        const telegramId = user.id.toString();
        console.log('[Telegram Auth] Looking for user with telegramId:', telegramId);
        // Extract referral code from start parameter in initData
        let referralCode = null;
        if (initData && initData.start_param) {
            referralCode = initData.start_param;
            console.log('[Telegram Auth] Referral code from start_param:', referralCode);
        }
        // Find or create user
        let existingUser = await db_1.default.user.findUnique({
            where: { telegramId },
            include: { wallet: true },
        });
        console.log('[Telegram Auth] Existing user found:', !!existingUser);
        if (existingUser) {
            // Validate referral code if provided and user doesn't have a referrer
            let referredBy = existingUser.referredBy;
            if (!referredBy && referralCode) {
                console.log('[Telegram Auth] Processing referral code for existing user:', referralCode);
                const referrer = await (0, referral_1.validateReferralCode)(referralCode);
                if (referrer && referrer.id !== existingUser.id) {
                    referredBy = referrer.id;
                    console.log('[Telegram Auth] Referral code validated, referred by:', referrer.id);
                }
                else {
                    console.log('[Telegram Auth] Invalid or self-referral code:', referralCode);
                }
            }
            // Update user info if changed
            existingUser = await db_1.default.user.update({
                where: { telegramId },
                data: {
                    telegramUsername: user.username,
                    telegramFirstName: user.first_name,
                    telegramLastName: user.last_name,
                    telegramLanguageCode: user.language_code,
                    referredBy: referredBy,
                },
                include: { wallet: true },
            });
            // Generate JWT token
            const token = jsonwebtoken_1.default.sign({ id: existingUser.id, telegramId: existingUser.telegramId, role: existingUser.role }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
            console.log('[Telegram Auth] User logged in successfully');
            return res.json({
                token,
                user: {
                    id: existingUser.id,
                    telegramId: existingUser.telegramId,
                    telegramUsername: existingUser.telegramUsername,
                    telegramFirstName: existingUser.telegramFirstName,
                    balance: existingUser.wallet?.balance,
                    role: existingUser.role,
                },
            });
        }
        // Validate referral code if provided
        let referredBy = null;
        if (referralCode) {
            console.log('[Telegram Auth] Processing referral code:', referralCode);
            const referrer = await (0, referral_1.validateReferralCode)(referralCode);
            if (referrer) {
                referredBy = referrer.id;
                console.log('[Telegram Auth] Referral code validated, referred by:', referrer.id, referrer.email);
            }
            else {
                console.log('[Telegram Auth] Invalid referral code:', referralCode);
            }
        }
        else {
            console.log('[Telegram Auth] No referral code provided');
        }
        // Create new user
        console.log('[Telegram Auth] Creating new user');
        const newUser = await db_1.default.user.create({
            data: {
                telegramId,
                telegramUsername: user.username,
                telegramFirstName: user.first_name,
                telegramLastName: user.last_name,
                telegramLanguageCode: user.language_code,
                emailVerified: true, // Telegram users are pre-verified
                referredBy,
                wallet: { create: { balance: 0 } },
            },
            include: { wallet: true },
        });
        // Generate referral code for the new user
        await (0, referral_1.assignReferralCode)(newUser.id);
        // Generate JWT token
        const token = jsonwebtoken_1.default.sign({ id: newUser.id, telegramId: newUser.telegramId, role: newUser.role }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
        console.log('[Telegram Auth] New user created successfully');
        return res.json({
            token,
            user: {
                id: newUser.id,
                telegramId: newUser.telegramId,
                telegramUsername: newUser.telegramUsername,
                telegramFirstName: newUser.telegramFirstName,
                balance: newUser.wallet?.balance,
                role: newUser.role,
            },
        });
    }
    catch (err) {
        console.error('[Telegram Auth] Error:', err);
        return res.status(500).json({ message: 'Server error', error: String(err) });
    }
});
// ─── Create Referral Token ───────────────────────────────────────────────────────
router.post('/referral-token', async (req, res) => {
    const { referralCode } = req.body;
    if (!referralCode) {
        return res.status(400).json({ message: 'Referral code is required' });
    }
    try {
        // Validate referral code
        const referrer = await (0, referral_1.validateReferralCode)(referralCode);
        if (!referrer) {
            return res.status(400).json({ message: 'Invalid referral code' });
        }
        // Generate a unique token
        const token = crypto_1.default.randomBytes(16).toString('hex');
        // Store the referral code with the token
        referralTokenStore.set(token, {
            referralCode,
            createdAt: Date.now()
        });
        console.log('[Referral Token] Created token for referral code:', referralCode);
        return res.json({ token });
    }
    catch (error) {
        console.error('[Referral Token] Error:', error);
        return res.status(500).json({ message: 'Server error' });
    }
});
// ─── Get Referral Info ─────────────────────────────────────────────────────────
router.get('/referral', auth_1.authenticate, async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    try {
        console.log('[Referral Info] Fetching referral info for user:', userId);
        const user = await db_1.default.user.findUnique({
            where: { id: userId },
            select: {
                referralCode: true,
                referredUsers: {
                    select: {
                        id: true,
                        telegramUsername: true,
                        email: true,
                        phoneNumber: true,
                        createdAt: true,
                        hasReceivedFirstDepositBonus: true
                    }
                }
            }
        });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        console.log('[Referral Info] User found:', user.referralCode, 'Referred users count:', user.referredUsers.length);
        // Ensure user has a referral code
        if (!user.referralCode) {
            const code = await (0, referral_1.assignReferralCode)(userId);
            user.referralCode = code;
        }
        const referredCount = user.referredUsers.length;
        const completedReferrals = user.referredUsers.filter(u => u.hasReceivedFirstDepositBonus).length;
        return res.json({
            referralCode: user.referralCode,
            referredCount,
            completedReferrals,
            referredUsers: user.referredUsers
        });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Server error' });
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map