import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

/**
 * Generate a unique 8-character referral code
 */
export function generateReferralCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Generate a unique referral code that doesn't already exist in the database
 */
export async function generateUniqueReferralCode(): Promise<string> {
  let code: string;
  let isUnique = false;
  
  while (!isUnique) {
    code = generateReferralCode();
    const existing = await prisma.user.findUnique({
      where: { referralCode: code }
    });
    if (!existing) {
      isUnique = true;
    }
  }
  
  return code!;
}

/**
 * Assign a referral code to a user if they don't have one
 */
export async function assignReferralCode(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });
  
  if (!user) {
    throw new Error('User not found');
  }
  
  if (user.referralCode) {
    return user.referralCode;
  }
  
  const referralCode = await generateUniqueReferralCode();
  
  await prisma.user.update({
    where: { id: userId },
    data: { referralCode }
  });
  
  return referralCode;
}

/**
 * Validate a referral code and return the referrer user
 */
export async function validateReferralCode(code: string) {
  const referrer = await prisma.user.findUnique({
    where: { referralCode: code },
    select: {
      id: true,
      email: true,
      telegramUsername: true
    }
  });
  
  return referrer;
}
