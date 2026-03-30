"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { sendInviteEmail } from "@/lib/email";
import { createServiceClient, LOGO_BUCKET } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity-log";

export async function updateClient(clientId: string, formData: FormData) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") throw new Error("Unauthorized");

  const companyName = (formData.get("companyName") as string).trim();
  const industry = (formData.get("industry") as string | null)?.trim() || null;
  const website = (formData.get("website") as string | null)?.trim() || null;
  const primaryAdminId = formData.get("primaryAdminId") as string;
  const logoFile = formData.get("logo") as File | null;
  const removeLogo = formData.get("removeLogo") === "true";

  if (!companyName) throw new Error("Company name is required");
  if (!primaryAdminId) throw new Error("Primary admin is required");

  // Handle logo
  let logoUrl: string | undefined | null = undefined; // undefined = no change
  if (removeLogo) {
    logoUrl = null;
  } else if (logoFile && logoFile.size > 0) {
    const supabase = createServiceClient();
    const ext = logoFile.name.split(".").pop();
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const bytes = await logoFile.arrayBuffer();
    const { error } = await supabase.storage
      .from(LOGO_BUCKET)
      .upload(filename, bytes, { contentType: logoFile.type, upsert: false });
    if (error) throw new Error(`Logo upload failed: ${error.message}`);
    const { data: urlData } = supabase.storage.from(LOGO_BUCKET).getPublicUrl(filename);
    logoUrl = urlData.publicUrl;
  }

  // Parse contacts
  const contactsRaw = formData.get("contacts") as string;
  let contacts: { name: string; title: string; phone: string; email: string }[] = [];
  try { contacts = contactsRaw ? JSON.parse(contactsRaw) : []; } catch { /* ignore malformed input */ }

  await db.$transaction(async (tx) => {
    await tx.client.update({
      where: { id: clientId },
      data: {
        companyName,
        industry,
        website,
        primaryAdminId,
        ...(logoUrl !== undefined ? { logoUrl } : {}),
      },
    });

    // Replace contacts: delete all then recreate
    await tx.clientContact.deleteMany({ where: { clientId } });
    if (contacts.length > 0) {
      await tx.clientContact.createMany({
        data: contacts.map((c, i) => ({
          clientId,
          name: c.name,
          title: c.title || null,
          phone: c.phone || null,
          email: c.email,
          isPrimary: i === 0,
          order: i,
        })),
      });
    }
  });

  await logActivity({
    actorType: "ADMIN",
    actorId: session.user.id,
    actorName: session.user.name ?? session.user.email ?? "",
    actorEmail: session.user.email ?? "",
    action: "CLIENT_UPDATED",
    clientId: clientId,
    subject: { type: "CLIENT", id: clientId, name: companyName },
  });

  revalidatePath(`/admin/clients/${clientId}`);
}

export async function reorderClientMilestones(clientId: string, orderedIds: string[]) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") throw new Error("Unauthorized");

  await db.$transaction(
    orderedIds.map((id, index) =>
      db.clientMilestone.update({ where: { id }, data: { order: index } })
    )
  );

  revalidatePath(`/admin/clients/${clientId}`);
}

// Assign a milestone definition to this client, cloning template fields for questionnaires
export async function assignMilestone(clientId: string, milestoneDefinitionId: string) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") throw new Error("Unauthorized");

  const last = await db.clientMilestone.findFirst({
    where: { clientId },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const clientMilestone = await db.clientMilestone.create({
    data: {
      clientId,
      milestoneDefinitionId,
      status: "ACTIVE",
      order: (last?.order ?? -1) + 1,
      assignedByAdminId: session.user.id,
    },
  });

  // Clone template fields from the definition (questionnaire type only)
  const templateFields = await db.questionnaireField.findMany({
    where: { milestoneDefinitionId },
    orderBy: { order: "asc" },
  });

  for (const field of templateFields) {
    await db.questionnaireField.create({
      data: {
        label: field.label,
        fieldType: field.fieldType,
        options: field.options ?? undefined,
        required: field.required,
        helpText: field.helpText,
        order: field.order,
        clientMilestoneId: clientMilestone.id,
      },
    });
  }

  const def = await db.milestoneDefinition.findUnique({
    where: { id: milestoneDefinitionId },
    select: { name: true },
  });

  await logActivity({
    actorType: "ADMIN",
    actorId: session.user.id,
    actorName: session.user.name ?? session.user.email ?? "",
    actorEmail: session.user.email ?? "",
    action: "MILESTONE_ASSIGNED",
    clientId,
    subject: { type: "MILESTONE", id: clientMilestone.id, name: def?.name ?? milestoneDefinitionId },
  });

  revalidatePath(`/admin/clients/${clientId}`);
}

// Remove a milestone from this client
export async function removeMilestone(clientMilestoneId: string, clientId: string) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") throw new Error("Unauthorized");

  const milestone = await db.clientMilestone.findUnique({
    where: { id: clientMilestoneId },
    include: { milestoneDefinition: { select: { name: true } } },
  });

  if (milestone?.status === "COMPLETED") {
    throw new Error("Completed milestones cannot be removed.");
  }

  await db.clientMilestone.delete({ where: { id: clientMilestoneId } });

  await logActivity({
    actorType: "ADMIN",
    actorId: session.user.id,
    actorName: session.user.name ?? session.user.email ?? "",
    actorEmail: session.user.email ?? "",
    action: "MILESTONE_UNASSIGNED",
    clientId,
    subject: { type: "MILESTONE", id: clientMilestoneId, name: milestone?.milestoneDefinition.name ?? clientMilestoneId },
  });

  revalidatePath(`/admin/clients/${clientId}`);
}

// Generate invite token and send email
export async function sendInvite(clientId: string, toEmail: string) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") throw new Error("Unauthorized");

  const client = await db.client.findUniqueOrThrow({
    where: { id: clientId },
    select: { companyName: true },
  });

  // Expire any existing unused tokens for this email+client
  await db.inviteToken.updateMany({
    where: { clientId, email: toEmail, usedAt: null },
    data: { expiresAt: new Date() },
  });

  const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours

  const token = await db.inviteToken.create({
    data: {
      clientId,
      email: toEmail,
      createdBy: session.user.id,
      expiresAt,
    },
  });

  const baseUrl = process.env.NEXTAUTH_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  const inviteUrl = `${baseUrl}/invite/${token.token}`;

  // Try to send email — fails silently if Resend not configured
  try {
    await sendInviteEmail({ to: toEmail, inviteUrl, companyName: client.companyName });
  } catch {
    // Email not configured yet — invite link still available in UI
  }

  await logActivity({
    actorType: "ADMIN",
    actorId: session.user.id,
    actorName: session.user.name ?? session.user.email ?? "",
    actorEmail: session.user.email ?? "",
    action: "CLIENT_INVITED",
    clientId,
    subject: { type: "CONTACT", id: toEmail, name: toEmail },
    metadata: { clientName: client.companyName },
  });

  revalidatePath(`/admin/clients/${clientId}`);
  return { inviteUrl, token: token.token };
}

export async function createClientLink(
  clientId: string,
  data: { type: string; title: string; url: string; description: string }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") throw new Error("Unauthorized");

  const last = await db.clientLink.findFirst({
    where: { clientId },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const link = await db.clientLink.create({
    data: {
      clientId,
      type: data.type,
      title: data.title.trim(),
      url: data.url.trim(),
      description: data.description.trim() || null,
      order: (last?.order ?? -1) + 1,
    },
  });

  await logActivity({
    actorType: "ADMIN",
    actorId: session.user.id,
    actorName: session.user.name ?? session.user.email ?? "",
    actorEmail: session.user.email ?? "",
    action: "LINK_ADDED",
    clientId,
    subject: { type: "LINK", id: link.id, name: link.title },
  });

  revalidatePath(`/admin/clients/${clientId}`);
}

export async function deleteClientLink(linkId: string, clientId: string) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") throw new Error("Unauthorized");

  const link = await db.clientLink.findUnique({ where: { id: linkId }, select: { title: true } });
  await db.clientLink.delete({ where: { id: linkId } });

  await logActivity({
    actorType: "ADMIN",
    actorId: session.user.id,
    actorName: session.user.name ?? session.user.email ?? "",
    actorEmail: session.user.email ?? "",
    action: "LINK_DELETED",
    clientId,
    subject: { type: "LINK", id: linkId, name: link?.title ?? linkId },
  });

  revalidatePath(`/admin/clients/${clientId}`);
}

export async function toggleClientActive(clientId: string, isActive: boolean) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") throw new Error("Unauthorized");

  const client = await db.client.update({ where: { id: clientId }, data: { isActive } });

  await logActivity({
    actorType: "ADMIN",
    actorId: session.user.id,
    actorName: session.user.name ?? session.user.email ?? "",
    actorEmail: session.user.email ?? "",
    action: isActive ? "CLIENT_REACTIVATED" : "CLIENT_DEACTIVATED",
    clientId,
    subject: { type: "CLIENT", id: clientId, name: client.companyName },
  });

  revalidatePath(`/admin/clients/${clientId}`);
  revalidatePath("/admin/clients");
  revalidatePath("/admin");
}

export async function reopenMilestone(clientMilestoneId: string, clientId: string) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") throw new Error("Unauthorized");

  const milestone = await db.clientMilestone.update({
    where: { id: clientMilestoneId },
    data: { status: "ACTIVE" },
    include: { milestoneDefinition: { select: { name: true } } },
  });

  await logActivity({
    actorType: "ADMIN",
    actorId: session.user.id,
    actorName: session.user.name ?? session.user.email ?? "",
    actorEmail: session.user.email ?? "",
    action: "MILESTONE_REOPENED",
    clientId,
    subject: { type: "MILESTONE", id: clientMilestoneId, name: milestone.milestoneDefinition.name },
  });

  revalidatePath(`/admin/clients/${clientId}`);
  revalidatePath(`/admin/clients/${clientId}/milestones/${clientMilestoneId}`);
}

export async function reorderClientLinks(clientId: string, orderedIds: string[]) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") throw new Error("Unauthorized");

  await db.$transaction(
    orderedIds.map((id, index) =>
      db.clientLink.update({ where: { id }, data: { order: index } })
    )
  );
  revalidatePath(`/admin/clients/${clientId}`);
}
