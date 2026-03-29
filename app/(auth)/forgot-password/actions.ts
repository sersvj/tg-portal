"use server";

import { db } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email";

export async function requestPasswordReset(email: string): Promise<{ success: boolean }> {
  // Always return success — don't reveal whether email exists
  const user = await db.user.findUnique({ where: { email } });
  if (!user) return { success: true };

  // Invalidate any existing unused tokens for this email
  await db.passwordResetToken.updateMany({
    where: { email, usedAt: null },
    data: { usedAt: new Date() },
  });

  const token = await db.passwordResetToken.create({
    data: {
      email,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    },
  });

  const baseUrl = process.env.NEXTAUTH_URL ?? `https://${process.env.VERCEL_URL}`;
  await sendPasswordResetEmail({
    to: email,
    resetUrl: `${baseUrl}/reset-password/${token.token}`,
  });

  return { success: true };
}
