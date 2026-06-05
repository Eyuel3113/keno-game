// import nodemailer from 'nodemailer';
// import path from 'path';
// import fs from 'fs';

// const port = Number(process.env.SMTP_PORT) || 587;
// const transporter = nodemailer.createTransport({
//   host: process.env.SMTP_HOST || 'smtp.gmail.com',
//   port,
//   secure: port === 465,
//   auth: {
//     user: process.env.SMTP_USER,
//     pass: process.env.SMTP_PASS,
//   },
// });

// const APP_URL = process.env.APP_URL || 'http://localhost:5173';
// const FROM = `"Kendo Game" <${process.env.SMTP_USER}>`;

// // Absolute path to the logo file in the server directory
// const logoPath = path.join(process.cwd(), 'src', 'logo.png');
// const logoBuffer = fs.readFileSync(logoPath);

// export async function sendVerificationEmail(to: string, token: string) {
//   const link = `${APP_URL}/verify-email?token=${token}`;
//   await transporter.sendMail({
//     from: FROM,
//     to,
//     subject: 'Verify your Kendo account',
//     html: `
//       <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#0f172a;color:#e2e8f0;padding:32px;border-radius:16px;text-align:center;">
//         <div style="margin-bottom:20px;text-align:center;">
//           <img src="cid:logo" alt="Kendo Game" style="width:120px;height:auto;border:none;display:inline-block;" />
//         </div>
//         <h1 style="color:#a78bfa;margin-top:0;margin-bottom:8px;font-size:24px;">Kendo Game</h1>
//         <h2 style="margin-top:0;font-size:18px;color:#cbd5e1;font-weight:normal;">Verify your email address</h2>
//         <p style="color:#94a3b8;font-size:14px;line-height:1.6;margin-top:16px;">Thanks for registering! Click the button below to verify your email and activate your account.</p>
//         <a href="${link}" style="display:inline-block;margin:24px 0;padding:14px 28px;background:linear-gradient(135deg,#7c3aed,#9333ea);color:#fff;text-decoration:none;border-radius:10px;font-weight:bold;font-size:15px;">
//           Verify Email
//         </a>
//         <p style="color:#64748b;font-size:13px;">This link expires in <strong>24 hours</strong>. If you didn't register, you can ignore this email.</p>
//       </div>
//     `,
//     attachments: [
//       {
//         content: logoBuffer,
//         cid: 'logo',
//         contentDisposition: 'inline',
//       },
//     ],
//   });
// }

// export async function sendPasswordResetEmail(to: string, token: string) {
//   const link = `${APP_URL}/reset-password?token=${token}`;
//   await transporter.sendMail({
//     from: FROM,
//     to,
//     subject: 'Reset your Kendo password',
//     html: `
//       <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#0f172a;color:#e2e8f0;padding:32px;border-radius:16px;text-align:center;">
//         <div style="margin-bottom:20px;text-align:center;">
//           <img src="cid:logo" alt="Kendo Game" style="width:120px;height:auto;border:none;display:inline-block;" />
//         </div>
//         <h1 style="color:#a78bfa;margin-top:0;margin-bottom:8px;font-size:24px;">Kendo Game</h1>
//         <h2 style="margin-top:0;font-size:18px;color:#cbd5e1;font-weight:normal;">Reset your password</h2>
//         <p style="color:#94a3b8;font-size:14px;line-height:1.6;margin-top:16px;">We received a request to reset your password. Click the button below to choose a new one.</p>
//         <a href="${link}" style="display:inline-block;margin:24px 0;padding:14px 28px;background:linear-gradient(135deg,#7c3aed,#9333ea);color:#fff;text-decoration:none;border-radius:10px;font-weight:bold;font-size:15px;">
//           Reset Password
//         </a>
//         <p style="color:#64748b;font-size:13px;">This link expires in <strong>1 hour</strong>. If you didn't request a reset, you can safely ignore this email.</p>
//       </div>
//     `,
//     attachments: [
//       {
//         content: logoBuffer,
//         cid: 'logo',
//         contentDisposition: 'inline',
//       },
//     ],
//   });
// }


import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import path from 'path';
import fs from 'fs';

const APP_URL = process.env.APP_URL || 'http://localhost:5173';
const USE_RESEND = process.env.EMAIL_PROVIDER === 'resend';

// ── SMTP setup (local) ──────────────────────────────────────────
const smtpTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// ── Resend setup (production) ───────────────────────────────────
const resend = USE_RESEND ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = USE_RESEND
  ? process.env.FROM_EMAIL!
  : `"Kendo Game" <${process.env.SMTP_USER}>`;

// ── Logo (lazy, won't crash if missing) ────────────────────────
function getLogoBuffer(): Buffer | null {
  try {
    return fs.readFileSync(path.join(process.cwd(), 'src', 'logo.png'));
  } catch {
    console.warn('Logo not found, sending without it');
    return null;
  }
}

// ── Shared HTML wrapper ─────────────────────────────────────────
function emailWrapper(body: string): string {
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#0f172a;color:#e2e8f0;padding:32px;border-radius:16px;text-align:center;">
      <div style="margin-bottom:20px;">
        <img src="cid:logo" alt="Kendo Game" style="width:120px;height:auto;" />
      </div>
      <h1 style="color:#a78bfa;margin-top:0;margin-bottom:8px;font-size:24px;">Kendo Game</h1>
      ${body}
    </div>
  `;
}

// ── Single send function (routes to SMTP or Resend) ─────────────
async function sendEmail(to: string, subject: string, html: string) {
  const logo = getLogoBuffer();

  if (USE_RESEND && resend) {
    const { error } = await resend.emails.send({
      from: FROM,
      to,
      subject,
      html,
      attachments: logo
        ? [{ filename: 'logo.png', content: logo, headers: { 'Content-ID': '<logo>' } }]
        : [],
    });
    if (error) throw new Error(`Resend error: ${error.message}`);
  } else {
    await smtpTransporter.sendMail({
      from: FROM,
      to,
      subject,
      html,
      attachments: logo
        ? [{ content: logo, cid: 'logo', contentDisposition: 'inline' }]
        : [],
    });
  }
}

// ── Public functions ────────────────────────────────────────────
export async function sendVerificationEmail(to: string, token: string) {
  const link = `${APP_URL}/verify-email?token=${token}`;
  await sendEmail(to, 'Verify your Kendo account', emailWrapper(`
    <h2 style="margin-top:0;font-size:18px;color:#cbd5e1;font-weight:normal;">Verify your email address</h2>
    <p style="color:#94a3b8;font-size:14px;line-height:1.6;">Thanks for registering! Click below to activate your account.</p>
    <a href="${link}" style="display:inline-block;margin:24px 0;padding:14px 28px;background:linear-gradient(135deg,#7c3aed,#9333ea);color:#fff;text-decoration:none;border-radius:10px;font-weight:bold;font-size:15px;">
      Verify Email
    </a>
    <p style="color:#64748b;font-size:13px;">Expires in <strong>24 hours</strong>. If you didn't register, ignore this.</p>
  `));
}

export async function sendPasswordResetEmail(to: string, token: string) {
  const link = `${APP_URL}/reset-password?token=${token}`;
  await sendEmail(to, 'Reset your Kendo password', emailWrapper(`
    <h2 style="margin-top:0;font-size:18px;color:#cbd5e1;font-weight:normal;">Reset your password</h2>
    <p style="color:#94a3b8;font-size:14px;line-height:1.6;">Click below to choose a new password.</p>
    <a href="${link}" style="display:inline-block;margin:24px 0;padding:14px 28px;background:linear-gradient(135deg,#7c3aed,#9333ea);color:#fff;text-decoration:none;border-radius:10px;font-weight:bold;font-size:15px;">
      Reset Password
    </a>
    <p style="color:#64748b;font-size:13px;">Expires in <strong>1 hour</strong>. If you didn't request this, ignore it.</p>
  `));
}