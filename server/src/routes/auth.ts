import { Router, Request, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../config/db';
import { sendVerificationEmail, sendPasswordResetEmail } from '../services/emailService';

const router = Router();

function formatEthiopianPhoneNumber(phone: string): string {
  let clean = phone.replace(/[^\d+]/g, '');
  if (clean.startsWith('0')) {
    clean = '+251' + clean.slice(1);
  } else if (clean.startsWith('251') && !clean.startsWith('+')) {
    clean = '+' + clean;
  } else if (!clean.startsWith('+') && /^[79]/.test(clean)) {
    clean = '+251' + clean;
  }
  return clean;
}

// ─── Register ─────────────────────────────────────────────────────────────────
router.post('/register', async (req: Request, res: Response) => {
  const { email, password, phoneNumber } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ message: 'User already exists' });
    }

    let formattedPhone: string | null = null;
    if (phoneNumber) {
      formattedPhone = formatEthiopianPhoneNumber(phoneNumber);
      const existingPhone = await prisma.user.findUnique({ where: { phoneNumber: formattedPhone } });
      if (existingPhone) {
        return res.status(409).json({ message: 'Phone number already registered' });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verifyToken = crypto.randomBytes(32).toString('hex');
    const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await prisma.user.create({
      data: {
        email,
        phoneNumber: formattedPhone,
        password: hashedPassword,
        verifyToken,
        verifyExpires,
        wallet: { create: { balance: 50 } },
      },
    });

    // Send verification email (non-blocking — don't fail registration if email fails)
    sendVerificationEmail(email, verifyToken).catch((err) =>
      console.error('[Email] Failed to send verification email:', err)
    );

    return res.status(201).json({
      message: 'Registration successful. Please check your email to verify your account.',
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// ─── Login ────────────────────────────────────────────────────────────────────
router.post('/login', async (req: Request, res: Response) => {
  const { email, identifier, password } = req.body;
  const loginId = identifier || email;

  if (!loginId || !password) {
    return res.status(400).json({ message: 'Identifier and password are required' });
  }

  try {
    let queryCond: any = { email: loginId };
    if (!loginId.includes('@')) {
      const formattedPhone = formatEthiopianPhoneNumber(loginId);
      queryCond = { phoneNumber: formattedPhone };
    }

    const user = await prisma.user.findFirst({
      where: queryCond,
      include: { wallet: true },
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!user.emailVerified) {
      return res.status(403).json({
        message: 'Please verify your email before signing in. Check your inbox for the verification link.',
      });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    return res.json({
      token,
      user: { id: user.id, email: user.email, phoneNumber: user.phoneNumber, balance: user.wallet?.balance },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// ─── Verify Email ─────────────────────────────────────────────────────────────
router.get('/verify-email', async (req: Request, res: Response) => {
  const { token } = req.query;

  if (!token || typeof token !== 'string') {
    return res.status(400).json({ message: 'Invalid token' });
  }

  try {
    const user = await prisma.user.findFirst({
      where: { verifyToken: token },
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired verification link.' });
    }

    if (user.verifyExpires && user.verifyExpires < new Date()) {
      return res.status(400).json({ message: 'Verification link has expired. Please register again.' });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verifyToken: null,
        verifyExpires: null,
      },
    });

    return res.json({ message: 'Email verified successfully! You can now sign in.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// ─── Forgot Password ──────────────────────────────────────────────────────────
router.post('/forgot-password', async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  // Always return 200 to avoid revealing which emails are registered
  const SAFE_RESPONSE = { message: 'If that email is registered, a reset link has been sent.' };

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.json(SAFE_RESPONSE);
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetExpires },
    });

    sendPasswordResetEmail(email, resetToken).catch((err) =>
      console.error('[Email] Failed to send reset email:', err)
    );

    return res.json(SAFE_RESPONSE);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// ─── Reset Password ───────────────────────────────────────────────────────────
router.post('/reset-password', async (req: Request, res: Response) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ message: 'Token and new password are required' });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters' });
  }

  try {
    const user = await prisma.user.findFirst({ where: { resetToken: token } });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset link.' });
    }

    if (user.resetExpires && user.resetExpires < new Date()) {
      return res.status(400).json({ message: 'Reset link has expired. Please request a new one.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetExpires: null,
      },
    });

    return res.json({ message: 'Password reset successfully! You can now sign in.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// ─── Resend Verification Email ────────────────────────────────────────────────
router.post('/resend-verification', async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || user.emailVerified) {
      // Don't reveal details
      return res.json({ message: 'If that account exists and is unverified, a new link has been sent.' });
    }

    const verifyToken = crypto.randomBytes(32).toString('hex');
    const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: { verifyToken, verifyExpires },
    });

    sendVerificationEmail(email, verifyToken).catch((err) =>
      console.error('[Email] Failed to resend verification email:', err)
    );

    return res.json({ message: 'If that account exists and is unverified, a new link has been sent.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// ─── Change Email ─────────────────────────────────────────────────────────────
router.post('/change-email', authenticate, async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const { currentPassword, newEmail } = req.body;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (!currentPassword || !newEmail) {
    return res.status(400).json({ message: 'Current password and new email are required' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid current password' });
    }

    const existing = await prisma.user.findUnique({ where: { email: newEmail } });
    if (existing) {
      return res.status(409).json({ message: 'Email already in use' });
    }

    const verifyToken = crypto.randomBytes(32).toString('hex');
    const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await prisma.user.update({
      where: { id: userId },
      data: {
        email: newEmail,
        emailVerified: false,
        verifyToken,
        verifyExpires,
      },
    });

    sendVerificationEmail(newEmail, verifyToken).catch((err) =>
      console.error('[Email] Failed to send verification email for email change:', err)
    );

    return res.json({ message: 'Email updated successfully. Please check your new email to verify it.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// ─── Change Password ──────────────────────────────────────────────────────────
router.post('/change-password', authenticate, async (req: AuthRequest, res: Response) => {
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
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid current password' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
      },
    });

    return res.json({ message: 'Password changed successfully.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

export default router;
