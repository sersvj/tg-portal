"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity-log";

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") throw new Error("Unauthorized");
  return session;
}

export async function createMilestoneDefinition(formData: FormData) {
  const session = await requireAdmin();
  const name = (formData.get("name") as string).trim();
  const description = (formData.get("description") as string | null)?.trim() || null;
  const type = formData.get("type") as string;

  if (!name || !type) return;

  const def = await db.milestoneDefinition.create({
    data: { name, description, type },
  });

  await logActivity({
    actorType: "ADMIN",
    actorId: session.user.id,
    actorName: session.user.name ?? session.user.email ?? "",
    actorEmail: session.user.email ?? "",
    action: "DEFINITION_CREATED",
    subject: { type: "DEFINITION", id: def.id, name: def.name },
  });

  revalidatePath("/admin/milestones");
}

export async function updateMilestoneDefinition(id: string, name: string, description: string | null) {
  const session = await requireAdmin();
  const def = await db.milestoneDefinition.update({
    where: { id },
    data: { name: name.trim(), description: description?.trim() || null },
  });

  await logActivity({
    actorType: "ADMIN",
    actorId: session.user.id,
    actorName: session.user.name ?? session.user.email ?? "",
    actorEmail: session.user.email ?? "",
    action: "DEFINITION_UPDATED",
    subject: { type: "DEFINITION", id: def.id, name: def.name },
  });

  revalidatePath("/admin/milestones");
}

export async function toggleMilestoneDefinition(id: string, isActive: boolean) {
  const session = await requireAdmin();
  const def = await db.milestoneDefinition.update({
    where: { id },
    data: { isActive },
  });

  await logActivity({
    actorType: "ADMIN",
    actorId: session.user.id,
    actorName: session.user.name ?? session.user.email ?? "",
    actorEmail: session.user.email ?? "",
    action: isActive ? "DEFINITION_ACTIVATED" : "DEFINITION_DEACTIVATED",
    subject: { type: "DEFINITION", id: def.id, name: def.name },
  });

  revalidatePath("/admin/milestones");
}

export async function deleteMilestoneDefinition(id: string) {
  const session = await requireAdmin();
  const def = await db.milestoneDefinition.findUnique({ where: { id }, select: { name: true } });
  // Remove all client assignments first (cascades to their fields and responses)
  await db.clientMilestone.deleteMany({ where: { milestoneDefinitionId: id } });
  // Delete the definition (cascades to its template fields via onDelete: Cascade)
  await db.milestoneDefinition.delete({ where: { id } });

  await logActivity({
    actorType: "ADMIN",
    actorId: session.user.id,
    actorName: session.user.name ?? session.user.email ?? "",
    actorEmail: session.user.email ?? "",
    action: "DEFINITION_DELETED",
    subject: { type: "DEFINITION", id, name: def?.name ?? id },
  });

  revalidatePath("/admin/milestones");
}
