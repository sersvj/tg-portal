"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendAdminInviteEmail } from "@/lib/email";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity-log";

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") throw new Error("Unauthorized");
  return session;
}

export async function inviteAdmin(
  email: string
): Promise<{ inviteUrl: string; token: string }> {
  const session = await requireAdmin();

  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail.endsWith("@tayloegray.com")) {
    throw new Error("Admin accounts must use a @tayloegray.com email address.");
  }

  // Check if this email already has an admin account
  const existing = await db.user.findUnique({ where: { email: normalizedEmail } });
  if (existing?.role === "ADMIN") {
    throw new Error("An admin account already exists for this email.");
  }

  // Expire any existing unused admin invites for this email
  await db.inviteToken.updateMany({
    where: { email: normalizedEmail, role: "ADMIN", usedAt: null },
    data: { expiresAt: new Date() },
  });

  const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours

  const token = await db.inviteToken.create({
    data: {
      email: normalizedEmail,
      role: "ADMIN",
      createdBy: session.user.id,
      expiresAt,
    },
  });

  const baseUrl = process.env.NEXTAUTH_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  const inviteUrl = `${baseUrl}/invite/${token.token}`;

  try {
    await sendAdminInviteEmail({ to: normalizedEmail, inviteUrl });
  } catch {
    // Email not configured — invite link still available in UI
  }

  await logActivity({
    actorType: "ADMIN",
    actorId: session.user.id,
    actorName: session.user.name ?? session.user.email ?? "",
    actorEmail: session.user.email ?? "",
    action: "ADMIN_INVITED",
    subject: { type: "ADMIN", id: normalizedEmail, name: normalizedEmail },
  });

  revalidatePath("/admin/team");
  return { inviteUrl, token: token.token };
}

export async function revokeAdminInvite(tokenId: string) {
  const session = await requireAdmin();
  const invite = await db.inviteToken.findUnique({ where: { id: tokenId }, select: { email: true } });
  await db.inviteToken.update({
    where: { id: tokenId },
    data: { expiresAt: new Date() },
  });

  await logActivity({
    actorType: "ADMIN",
    actorId: session.user.id,
    actorName: session.user.name ?? session.user.email ?? "",
    actorEmail: session.user.email ?? "",
    action: "ADMIN_INVITE_REVOKED",
    subject: { type: "ADMIN", id: tokenId, name: invite?.email ?? tokenId },
  });

  revalidatePath("/admin/team");
}

export async function removeAdmin(adminId: string, reassignToId: string | null) {
  const session = await requireAdmin();

  if (adminId === session.user.id) {
    throw new Error("You cannot remove your own account.");
  }

  // Ensure at least one admin will remain
  const adminCount = await db.user.count({ where: { role: "ADMIN" } });
  if (adminCount <= 1) {
    throw new Error("Cannot remove the last admin.");
  }

  const clientsManaged = await db.client.count({ where: { primaryAdminId: adminId } });

  if (clientsManaged > 0) {
    if (!reassignToId) {
      throw new Error("This admin manages clients. Provide a replacement admin.");
    }

    const replacement = await db.user.findUnique({ where: { id: reassignToId } });
    if (!replacement || replacement.role !== "ADMIN") {
      throw new Error("Replacement must be an active admin.");
    }

    await db.client.updateMany({
      where: { primaryAdminId: adminId },
      data: { primaryAdminId: reassignToId },
    });
  }

  // Resolve the admin to reassign historical milestone records to
  const fallbackAdminId = reassignToId ?? session.user.id;

  // Reassign ClientMilestone.assignedByAdminId (historical, no cascade on this FK)
  await db.clientMilestone.updateMany({
    where: { assignedByAdminId: adminId },
    data: { assignedByAdminId: fallbackAdminId },
  });

  // Remove invite tokens this admin created (no cascade on creator FK)
  await db.inviteToken.deleteMany({ where: { createdBy: adminId } });

  const removedAdmin = await db.user.findUnique({ where: { id: adminId }, select: { name: true, email: true } });

  // Delete the user (cascades to accounts + sessions via onDelete: Cascade)
  await db.user.delete({ where: { id: adminId } });

  await logActivity({
    actorType: "ADMIN",
    actorId: session.user.id,
    actorName: session.user.name ?? session.user.email ?? "",
    actorEmail: session.user.email ?? "",
    action: "ADMIN_REMOVED",
    subject: { type: "ADMIN", id: adminId, name: removedAdmin?.name ?? removedAdmin?.email ?? adminId },
  });

  revalidatePath("/admin/team");
}
