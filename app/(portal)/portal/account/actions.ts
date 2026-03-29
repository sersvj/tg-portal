"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function changePasswordClient(data: {
  currentPassword: string;
  newPassword: string;
}): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { passwordHash: true },
  });

  if (!user?.passwordHash) return { error: "No password set on this account." };

  const valid = await bcrypt.compare(data.currentPassword, user.passwordHash);
  if (!valid) return { error: "Current password is incorrect." };

  if (data.newPassword.length < 8) return { error: "New password must be at least 8 characters." };

  const passwordHash = await bcrypt.hash(data.newPassword, 12);
  await db.user.update({ where: { id: session.user.id }, data: { passwordHash } });

  return {};
}
