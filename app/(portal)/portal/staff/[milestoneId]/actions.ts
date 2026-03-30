"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { uploadToDropbox } from "@/lib/dropbox";
import { notifyMilestoneComplete } from "@/lib/notifications";
import { logActivity, resolveClientActorName } from "@/lib/activity-log";
import { revalidatePath } from "next/cache";

const ALLOWED_TAGS = new Set([
  "p", "strong", "em", "h2", "h3", "ul", "ol", "li", "br", "blockquote", "code", "pre", "a",
]);

function sanitizeBio(html: string | null): string | null {
  if (!html) return null;

  // Normalize <a> tags: keep only safe http/https/mailto hrefs
  let safe = html.replace(/<a\b[^>]*>/gi, (match) => {
    const hrefMatch = match.match(/href="([^"]*)"/i);
    const href = hrefMatch?.[1] ?? "";
    return /^(https?:|mailto:)/i.test(href)
      ? `<a href="${href}" rel="noopener noreferrer" target="_blank">`
      : "";
  });

  // Strip any opening tag not in allowlist; strip attributes from allowed tags
  safe = safe.replace(/<([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g, (match, tag) => {
    const t = tag.toLowerCase();
    if (!ALLOWED_TAGS.has(t)) return "";
    if (t === "a") return match; // already cleaned above
    return `<${t}>`;
  });

  // Strip closing tags not in allowlist
  safe = safe.replace(/<\/([a-zA-Z][a-zA-Z0-9]*)>/g, (_, tag) =>
    ALLOWED_TAGS.has(tag.toLowerCase()) ? `</${tag.toLowerCase()}>` : ""
  );

  return safe.trim() || null;
}

async function getMilestoneForUser(milestoneId: string, userId: string) {
  return db.clientMilestone.findFirst({
    where: {
      id: milestoneId,
      status: "ACTIVE",
      client: { clientUsers: { some: { userId } } },
    },
    include: {
      client: {
        select: { id: true, companyName: true, primaryAdmin: { select: { email: true } } },
      },
      milestoneDefinition: { select: { name: true } },
    },
  });
}

export async function saveStaffMember(milestoneId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const milestone = await getMilestoneForUser(milestoneId, session.user.id);
  if (!milestone) throw new Error("Milestone not found or not accessible");

  const profileId      = formData.get("profileId") as string | null;
  const name           = (formData.get("name") as string).trim();
  const title          = (formData.get("title") as string | null)?.trim() || null;
  const bio            = sanitizeBio((formData.get("bio") as string | null)?.trim() || null);
  const noHeadshot     = formData.get("noHeadshot") === "true";
  const headshotFile   = formData.get("headshot") as File | null;

  if (!name) throw new Error("Name is required");

  let headshotFilename: string | null = null;

  if (!noHeadshot && headshotFile && headshotFile.size > 0) {
    if (!headshotFile.type.startsWith("image/")) {
      throw new Error("Headshot must be an image file.");
    }
    if (!milestone.dropboxFolderPath) {
      throw new Error("No Dropbox folder configured for this milestone. Please contact your account manager.");
    }
    const buffer = Buffer.from(await headshotFile.arrayBuffer());
    await uploadToDropbox(milestone.dropboxFolderPath, headshotFile.name, buffer);
    headshotFilename = headshotFile.name;
  }

  if (profileId) {
    // On edit: only overwrite headshotFilename if a new file was uploaded or noHeadshot toggled
    const updateData: Parameters<typeof db.staffProfile.update>[0]["data"] = {
      name, title, bio, noHeadshot,
    };
    if (noHeadshot) {
      updateData.headshotFilename = null;
    } else if (headshotFilename) {
      updateData.headshotFilename = headshotFilename;
    }
    // Include clientMilestoneId in where clause to prevent IDOR
    await db.staffProfile.update({ where: { id: profileId, clientMilestoneId: milestoneId }, data: updateData });
  } else {
    const count = await db.staffProfile.count({ where: { clientMilestoneId: milestoneId } });
    await db.staffProfile.create({
      data: {
        clientMilestoneId: milestoneId,
        name, title, bio, noHeadshot,
        headshotFilename: noHeadshot ? null : headshotFilename,
        order: count,
      },
    });
  }

  revalidatePath(`/portal/staff/${milestoneId}`);
}

export async function deleteStaffMember(milestoneId: string, profileId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const milestone = await getMilestoneForUser(milestoneId, session.user.id);
  if (!milestone) throw new Error("Unauthorized");

  await db.staffProfile.delete({ where: { id: profileId, clientMilestoneId: milestoneId } });
  revalidatePath(`/portal/staff/${milestoneId}`);
}

export async function submitStaffMilestone(milestoneId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const milestone = await getMilestoneForUser(milestoneId, session.user.id);
  if (!milestone) throw new Error("Milestone not found or not accessible");

  const count = await db.staffProfile.count({ where: { clientMilestoneId: milestoneId } });
  if (count === 0) throw new Error("Please add at least one team member before submitting.");

  await db.clientMilestone.update({
    where: { id: milestoneId },
    data: { status: "COMPLETED", completedAt: new Date() },
  });

  await notifyMilestoneComplete({
    to: milestone.client.primaryAdmin.email,
    clientId: milestone.client.id,
    clientName: milestone.client.companyName,
    milestoneName: milestone.milestoneDefinition.name,
    milestoneType: "staff_profiles",
  });

  const actorEmail = session.user.email ?? "";
  const actorName = await resolveClientActorName(actorEmail, milestone.client.id, session.user.name ?? actorEmail);
  await logActivity({
    actorType: "CLIENT",
    actorId: session.user.id,
    actorName,
    actorEmail,
    action: "STAFF_PROFILES_SUBMITTED",
    clientId: milestone.client.id,
    subject: { type: "MILESTONE", id: milestoneId, name: milestone.milestoneDefinition.name },
    metadata: { count },
  });

  revalidatePath("/portal");
}
