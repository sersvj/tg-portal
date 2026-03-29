"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { uploadToDropbox } from "@/lib/dropbox";
import { notifyMilestoneComplete } from "@/lib/notifications";
import { revalidatePath } from "next/cache";
import { logActivity, resolveClientActorName } from "@/lib/activity-log";

export async function uploadMilestoneFile(milestoneId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const milestone = await db.clientMilestone.findFirst({
    where: {
      id: milestoneId,
      status: "ACTIVE",
      client: { clientUsers: { some: { userId: session.user.id } } },
    },
    include: {
      client: {
        select: {
          id: true,
          companyName: true,
          primaryAdmin: { select: { email: true } },
        },
      },
      milestoneDefinition: { select: { name: true, type: true } },
    },
  });

  if (!milestone) throw new Error("Milestone not found or not accessible");
  if (!milestone.dropboxFolderPath) throw new Error("No Dropbox folder configured for this milestone. Please contact your account manager.");

  const files = formData.getAll("files") as File[];
  if (files.length === 0) throw new Error("No files provided");

  const uploaded: { filename: string; path: string; size: number }[] = [];

  for (const file of files) {
    if (file.size === 0) continue;
    const buffer = Buffer.from(await file.arrayBuffer());
    const dropboxPath = await uploadToDropbox(milestone.dropboxFolderPath, file.name, buffer);
    uploaded.push({ filename: file.name, path: dropboxPath, size: file.size });
  }

  // Record files in DB
  await db.milestoneFile.createMany({
    data: uploaded.map((f) => ({
      milestoneId,
      filename: f.filename,
      dropboxPath: f.path,
      sizeBytes: f.size,
    })),
  });

  const uploadActorEmail = session.user.email ?? "";
  const uploadActorName = await resolveClientActorName(uploadActorEmail, milestone.client.id, session.user.name ?? (uploadActorEmail || session.user.id));
  await logActivity({
    actorType: "CLIENT",
    actorId: session.user.id,
    actorName: uploadActorName,
    actorEmail: uploadActorEmail,
    action: "FILES_UPLOADED",
    clientId: milestone.client.id,
    subject: { type: "MILESTONE", id: milestoneId, name: milestone.milestoneDefinition.name },
    metadata: { count: uploaded.length, files: uploaded.map((f) => f.filename) },
  });

  revalidatePath(`/portal/upload/${milestoneId}`);
  return { count: uploaded.length };
}

export async function completeMilestone(milestoneId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const milestone = await db.clientMilestone.findFirst({
    where: {
      id: milestoneId,
      status: "ACTIVE",
      client: { clientUsers: { some: { userId: session.user.id } } },
    },
    include: {
      client: {
        select: {
          id: true,
          companyName: true,
          primaryAdmin: { select: { email: true } },
        },
      },
      milestoneDefinition: { select: { name: true, type: true } },
      uploadedFiles: { select: { id: true } },
    },
  });

  if (!milestone) throw new Error("Milestone not found or not accessible");
  if (milestone.uploadedFiles.length === 0) throw new Error("Please upload at least one file before marking complete.");

  await db.clientMilestone.update({
    where: { id: milestoneId },
    data: { status: "COMPLETED", completedAt: new Date() },
  });

  await notifyMilestoneComplete({
    to: milestone.client.primaryAdmin.email,
    clientId: milestone.client.id,
    clientName: milestone.client.companyName,
    milestoneName: milestone.milestoneDefinition.name,
    milestoneType: milestone.milestoneDefinition.type,
  });

  const completeActorEmail = session.user.email ?? "";
  const completeActorName = await resolveClientActorName(completeActorEmail, milestone.client.id, session.user.name ?? (completeActorEmail || session.user.id));
  await logActivity({
    actorType: "CLIENT",
    actorId: session.user.id,
    actorName: completeActorName,
    actorEmail: completeActorEmail,
    action: "UPLOAD_SUBMITTED",
    clientId: milestone.client.id,
    subject: { type: "MILESTONE", id: milestoneId, name: milestone.milestoneDefinition.name },
  });

  revalidatePath("/portal");
}
