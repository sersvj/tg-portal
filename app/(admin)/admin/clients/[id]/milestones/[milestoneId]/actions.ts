"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { FieldType, PageNodeType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { parseFieldOptions } from "@/lib/field-options";
import { listDropboxFolders, ensureDropboxFolder } from "@/lib/dropbox";

export async function saveMilestoneConfig(
  milestoneId: string,
  clientId: string,
  formData: FormData
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") throw new Error("Unauthorized");

  const instructions = (formData.get("instructions") as string | null)?.trim() || null;
  const dropboxFolderPath = (formData.get("dropboxFolderPath") as string | null)?.trim() || null;

  // Create the folder in Dropbox if a path was set
  if (dropboxFolderPath) {
    await ensureDropboxFolder(dropboxFolderPath);
  }

  await db.clientMilestone.update({
    where: { id: milestoneId },
    data: { instructions, dropboxFolderPath },
  });

  revalidatePath(`/admin/clients/${clientId}/milestones/${milestoneId}`);
}

export async function browseFolders(path: string) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") throw new Error("Unauthorized");
  return listDropboxFolders(path);
}

export async function createClientField(clientMilestoneId: string, clientId: string, formData: FormData) {
  const label = (formData.get("label") as string).trim();
  const fieldType = formData.get("fieldType") as FieldType;
  const required = formData.get("required") === "on";
  const helpText = (formData.get("helpText") as string | null)?.trim() || null;
  const options = parseFieldOptions(fieldType, formData);

  const last = await db.questionnaireField.findFirst({
    where: { clientMilestoneId },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  await db.questionnaireField.create({
    data: {
      label,
      fieldType,
      required,
      helpText,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      options: options as any ?? undefined,
      order: (last?.order ?? -1) + 1,
      clientMilestoneId,
    },
  });

  revalidatePath(`/admin/clients/${clientId}/milestones/${clientMilestoneId}`);
}

export async function updateClientField(
  fieldId: string,
  clientMilestoneId: string,
  clientId: string,
  formData: FormData
) {
  const label = (formData.get("label") as string).trim();
  const fieldType = formData.get("fieldType") as FieldType;
  const required = formData.get("required") === "on";
  const helpText = (formData.get("helpText") as string | null)?.trim() || null;
  const options = parseFieldOptions(fieldType, formData);

  await db.questionnaireField.update({
    where: { id: fieldId },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: { label, fieldType, required, helpText, options: options as any ?? undefined },
  });

  revalidatePath(`/admin/clients/${clientId}/milestones/${clientMilestoneId}`);
}

export async function deleteClientField(fieldId: string, clientMilestoneId: string, clientId: string) {
  await db.questionnaireField.delete({ where: { id: fieldId } });
  revalidatePath(`/admin/clients/${clientId}/milestones/${clientMilestoneId}`);
}

export async function reorderClientFields(
  clientMilestoneId: string,
  clientId: string,
  orderedIds: string[]
) {
  await db.$transaction(
    orderedIds.map((id, index) =>
      db.questionnaireField.update({ where: { id }, data: { order: index } })
    )
  );
  revalidatePath(`/admin/clients/${clientId}/milestones/${clientMilestoneId}`);
}

// ── Page Node CRUD ───────────────────────────────────────────────────────────

export async function createPageNode(
  milestoneId: string,
  clientId: string,
  data: { title: string; type: PageNodeType; parentId: string | null; isOptional: boolean }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") throw new Error("Unauthorized");

  // Enforce max 2 levels
  if (data.parentId) {
    const parent = await db.pageNode.findUnique({ where: { id: data.parentId }, select: { parentId: true } });
    if (parent?.parentId) throw new Error("Maximum nesting depth is 2 levels.");
  }

  // Labels cannot be children
  if (data.type === "LABEL" && data.parentId) throw new Error("Labels must be top-level.");

  const count = await db.pageNode.count({ where: { clientMilestoneId: milestoneId, parentId: data.parentId } });

  await db.pageNode.create({
    data: {
      clientMilestoneId: milestoneId,
      parentId: data.parentId,
      type: data.type,
      title: data.title.trim(),
      isOptional: data.isOptional,
      order: count,
    },
  });

  revalidatePath(`/admin/clients/${clientId}/milestones/${milestoneId}`);
}

export async function updatePageNode(
  nodeId: string,
  milestoneId: string,
  clientId: string,
  data: { title: string; isOptional: boolean }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") throw new Error("Unauthorized");

  await db.pageNode.update({
    where: { id: nodeId, clientMilestoneId: milestoneId },
    data: { title: data.title.trim(), isOptional: data.isOptional },
  });

  revalidatePath(`/admin/clients/${clientId}/milestones/${milestoneId}`);
}

export async function deletePageNode(nodeId: string, milestoneId: string, clientId: string) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") throw new Error("Unauthorized");

  await db.pageNode.delete({ where: { id: nodeId, clientMilestoneId: milestoneId } });
  revalidatePath(`/admin/clients/${clientId}/milestones/${milestoneId}`);
}

export async function reorderPageNodes(
  milestoneId: string,
  clientId: string,
  parentId: string | null,
  orderedIds: string[]
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") throw new Error("Unauthorized");

  await db.$transaction(
    orderedIds.map((id, index) =>
      db.pageNode.update({ where: { id, clientMilestoneId: milestoneId }, data: { order: index } })
    )
  );

  revalidatePath(`/admin/clients/${clientId}/milestones/${milestoneId}`);
}

export async function createPageField(
  nodeId: string,
  milestoneId: string,
  clientId: string,
  formData: FormData
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") throw new Error("Unauthorized");

  const label = (formData.get("label") as string).trim();
  const fieldType = formData.get("fieldType") as FieldType;
  const required = formData.get("required") === "on";
  const helpText = (formData.get("helpText") as string | null)?.trim() || null;

  const count = await db.pageFieldTemplate.count({ where: { pageNodeId: nodeId } });

  await db.pageFieldTemplate.create({
    data: { pageNodeId: nodeId, label, fieldType, required, helpText, order: count },
  });

  revalidatePath(`/admin/clients/${clientId}/milestones/${milestoneId}`);
}

export async function deletePageField(fieldId: string, milestoneId: string, clientId: string) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") throw new Error("Unauthorized");

  await db.pageFieldTemplate.delete({ where: { id: fieldId } });
  revalidatePath(`/admin/clients/${clientId}/milestones/${milestoneId}`);
}

// ── Milestone reopen ──────────────────────────────────────────────────────────

export async function reopenMilestone(milestoneId: string, clientId: string) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") throw new Error("Unauthorized");

  await db.clientMilestone.update({
    where: { id: milestoneId },
    data: { status: "ACTIVE" },
  });

  revalidatePath(`/admin/clients/${clientId}/milestones/${milestoneId}`);
  revalidatePath(`/admin/clients/${clientId}`);
}
