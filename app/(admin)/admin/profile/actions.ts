"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

export async function updateProfile(data: {
  name: string;
  email: string;
}): Promise<{ error?: string }> {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") return { error: "Unauthorized" };

  const { name, email } = data;

  // Check email isn't taken by another user
  const existing = await db.user.findUnique({ where: { email } });
  if (existing && existing.id !== session.user.id) {
    return { error: "That email is already in use." };
  }

  await db.user.update({
    where: { id: session.user.id },
    data: { name: name.trim() || null, email: email.trim() },
  });

  revalidatePath("/admin/profile");
  return {};
}

export async function changePassword(data: {
  currentPassword: string;
  newPassword: string;
}): Promise<{ error?: string }> {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") return { error: "Unauthorized" };

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
