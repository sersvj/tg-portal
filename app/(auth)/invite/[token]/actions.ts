"use server";

import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function redeemInvite(
  token: string,
  name: string,
  password: string
): Promise<{ email: string; role: string }> {
  const invite = await db.inviteToken.findUnique({
    where: { token },
    include: { client: { select: { id: true, companyName: true } } },
  });

  if (!invite) throw new Error("Invalid invite link.");
  if (invite.usedAt) throw new Error("This invite has already been used.");
  if (invite.expiresAt < new Date()) throw new Error("This invite has expired.");

  const role = invite.role as "ADMIN" | "CLIENT";
  const passwordHash = await bcrypt.hash(password, 12);

  const existingUser = await db.user.findUnique({ where: { email: invite.email } });

  let userId: string;

  if (existingUser) {
    userId = existingUser.id;
  } else {
    const user = await db.user.create({
      data: {
        email: invite.email,
        name: name.trim() || null,
        passwordHash,
        role,
      },
    });
    userId = user.id;
  }

  // Only link to client for CLIENT invites
  if (role === "CLIENT" && invite.clientId) {
    await db.clientUser.upsert({
      where: { clientId_userId: { clientId: invite.clientId, userId } },
      create: { clientId: invite.clientId, userId },
      update: {},
    });
  }

  await db.inviteToken.update({
    where: { token },
    data: { usedAt: new Date() },
  });

  return { email: invite.email, role };
}
