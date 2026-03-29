"use server";

import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function resetPassword(token: string, newPassword: string): Promise<{ error?: string }> {
  const record = await db.passwordResetToken.findUnique({ where: { token } });

  if (!record || record.usedAt) return { error: "This reset link is invalid or has already been used." };
  if (record.expiresAt < new Date()) return { error: "This reset link has expired. Please request a new one." };

  const user = await db.user.findUnique({ where: { email: record.email } });
  if (!user) return { error: "No account found for this reset link." };

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await db.$transaction([
    db.user.update({ where: { id: user.id }, data: { passwordHash } }),
    db.passwordResetToken.update({ where: { token }, data: { usedAt: new Date() } }),
  ]);

  return {};
}
