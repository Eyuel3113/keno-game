import axios from 'axios';
import * as path from 'path';
import * as fs from 'fs';

const BREVO_API_KEY = process.env.BREVO_API_KEY || '';
const BREVO_FROM_EMAIL = process.env.BREVO_FROM_EMAIL || process.env.SMTP_USER;

const APP_URL = process.env.APP_URL || 'http://localhost:5173';

// Load logo for email attachment
const logoPath = path.join(process.cwd(), 'src', 'logo.png');
let logoBuffer: Buffer | null = null;
try {
  logoBuffer = fs.readFileSync(logoPath);
} catch (error) {
  console.warn('[Email] Logo file not found at:', logoPath, '- emails will be sent without logo');
}

export async function sendVerificationEmail(to: string, token: string) {
  const link = `${APP_URL}/verify-email?token=${token}`;
  console.log('[Email] Sending verification email to:', to);
  console.log('[Email] Using FROM:', BREVO_FROM_EMAIL);
  console.log('[Email] Brevo API Key exists:', !!BREVO_API_KEY);
  
  try {
    const response = await axios.post('https://api.brevo.com/v3/smtp/email', {
      sender: { email: BREVO_FROM_EMAIL, name: 'Kendo Game' },
      to: [{ email: to }],
      subject: 'Verify your Kendo account',
      htmlContent: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#0f172a;color:#e2e8f0;padding:32px;border-radius:16px;text-align:center;">
          <h1 style="color:#a78bfa;margin-top:0;margin-bottom:8px;font-size:24px;">Kendo Game</h1>
          <h2 style="margin-top:0;font-size:18px;color:#cbd5e1;font-weight:normal;">Verify your email address</h2>
          <p style="color:#94a3b8;font-size:14px;line-height:1.6;margin-top:16px;">Thanks for registering! Click the button below to verify your email and activate your account.</p>
          <a href="${link}" style="display:inline-block;margin:24px 0;padding:14px 28px;background:linear-gradient(135deg,#7c3aed,#9333ea);color:#fff;text-decoration:none;border-radius:10px;font-weight:bold;font-size:15px;">
            Verify Email
          </a>
          <p style="color:#64748b;font-size:13px;">This link expires in <strong>24 hours</strong>. If you didn't register, you can ignore this email.</p>
        </div>
      `,
    }, {
      headers: {
        'api-key': BREVO_API_KEY,
        'Content-Type': 'application/json',
      },
    });
    console.log('[Email] Verification email sent successfully:', response.data);
  } catch (error) {
    console.error('[Email] Failed to send verification email:', error);
    throw error;
  }
}

export async function sendPasswordResetEmail(to: string, token: string) {
  const link = `${APP_URL}/reset-password?token=${token}`;
  console.log('[Email] Sending password reset email to:', to);
  
  try {
    const response = await axios.post('https://api.brevo.com/v3/smtp/email', {
      sender: { email: BREVO_FROM_EMAIL, name: 'Kendo Game' },
      to: [{ email: to }],
      subject: 'Reset your Kendo password',
      htmlContent: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#0f172a;color:#e2e8f0;padding:32px;border-radius:16px;text-align:center;">
          <h1 style="color:#a78bfa;margin-top:0;margin-bottom:8px;font-size:24px;">Kendo Game</h1>
          <h2 style="margin-top:0;font-size:18px;color:#cbd5e1;font-weight:normal;">Reset your password</h2>
          <p style="color:#94a3b8;font-size:14px;line-height:1.6;margin-top:16px;">We received a request to reset your password. Click the button below to choose a new one.</p>
          <a href="${link}" style="display:inline-block;margin:24px 0;padding:14px 28px;background:linear-gradient(135deg,#7c3aed,#9333ea);color:#fff;text-decoration:none;border-radius:10px;font-weight:bold;font-size:15px;">
            Reset Password
          </a>
          <p style="color:#64748b;font-size:13px;">This link expires in <strong>1 hour</strong>. If you didn't request a reset, you can safely ignore this email.</p>
        </div>
      `,
    }, {
      headers: {
        'api-key': BREVO_API_KEY,
        'Content-Type': 'application/json',
      },
    });
    console.log('[Email] Password reset email sent successfully:', response.data);
  } catch (error) {
    console.error('[Email] Failed to send password reset email:', error);
    throw error;
  }
}
