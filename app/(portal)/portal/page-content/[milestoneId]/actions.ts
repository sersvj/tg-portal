"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notifyMilestoneComplete } from "@/lib/notifications";
import { logActivity, resolveClientActorName } from "@/lib/activity-log";
import { revalidatePath } from "next/cache";

const ALLOWED_TAGS = new Set([
  "p", "strong", "em", "h2", "h3", "ul", "ol", "li", "br", "blockquote", "code", "pre", "a",
]);

function sanitizeContent(html: string | null): string | null {
  if (!html) return null;

  let safe = html.replace(/<a\b[^>]*>/gi, (match) => {
    const hrefMatch = match.match(/href="([^"]*)"/i);
    const href = hrefMatch?.[1] ?? "";
    return /^(https?:|mailto:)/i.test(href)
      ? `<a href="${href}" rel="noopener noreferrer" target="_blank">`
      : "";
  });

  safe = safe.replace(/<([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g, (match, tag) => {
    const t = tag.toLowerCase();
    if (!ALLOWED_TAGS.has(t)) return "";
    if (t === "a") return match;
    return `<${t}>`;
  });

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

export async function savePageContent(milestoneId: string, nodeId: string, content: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const milestone = await getMilestoneForUser(milestoneId, session.user.id);
  if (!milestone) throw new Error("Unauthorized");

  const sanitized = sanitizeContent(content);

  await db.pageNode.update({
    where: { id: nodeId, clientMilestoneId: milestoneId },
    data: { content: sanitized },
  });
  // No revalidatePath — auto-save, client manages state
}

export async function savePageFieldAnswer(
  milestoneId: string,
  nodeId: string,
  fieldTemplateId: string,
  value: string
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const milestone = await getMilestoneForUser(milestoneId, session.user.id);
  if (!milestone) throw new Error("Unauthorized");

  await db.pageFieldAnswer.upsert({
    where: { pageNodeId_fieldTemplateId: { pageNodeId: nodeId, fieldTemplateId } },
    create: { pageNodeId: nodeId, fieldTemplateId, value },
    update: { value },
  });
}

export async function togglePageNA(milestoneId: string, nodeId: string, isNA: boolean) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const milestone = await getMilestoneForUser(milestoneId, session.user.id);
  if (!milestone) throw new Error("Unauthorized");

  await db.pageNode.update({
    where: { id: nodeId, clientMilestoneId: milestoneId },
    data: { isNA },
  });

  revalidatePath(`/portal/page-content/${milestoneId}`);
}

export async function submitPageContentMilestone(milestoneId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const milestone = await getMilestoneForUser(milestoneId, session.user.id);
  if (!milestone) throw new Error("Milestone not found or not accessible");

  // Load all PAGE nodes for validation
  const pageNodes = await db.pageNode.findMany({
    where: { clientMilestoneId: milestoneId, type: "PAGE" },
    select: { title: true, isOptional: true, isNA: true, content: true },
  });

  if (pageNodes.length === 0) {
    throw new Error("No pages have been defined for this milestone. Please contact your account manager.");
  }

  const missing = pageNodes.filter(
    (n) => !n.isOptional && !n.isNA && (!n.content || n.content.trim() === "" || n.content === "<p></p>")
  );

  if (missing.length > 0) {
    const names = missing.map((n) => `"${n.title}"`).join(", ");
    throw new Error(
      `Please add content to the following page${missing.length > 1 ? "s" : ""} before submitting: ${names}. If a page is no longer needed, mark it as N/A.`
    );
  }

  await db.clientMilestone.update({
    where: { id: milestoneId },
    data: { status: "COMPLETED", completedAt: new Date() },
  });

  await notifyMilestoneComplete({
    to: milestone.client.primaryAdmin.email,
    clientId: milestone.client.id,
    clientName: milestone.client.companyName,
    milestoneName: milestone.milestoneDefinition.name,
    milestoneType: "page_content",
  });

  const actorEmail = session.user.email ?? "";
  const actorName = await resolveClientActorName(actorEmail, milestone.client.id, session.user.name ?? actorEmail);
  await logActivity({
    actorType: "CLIENT",
    actorId: session.user.id,
    actorName,
    actorEmail,
    action: "PAGE_CONTENT_SUBMITTED",
    clientId: milestone.client.id,
    subject: { type: "MILESTONE", id: milestoneId, name: milestone.milestoneDefinition.name },
    metadata: { pageCount: pageNodes.length },
  });

  revalidatePath("/portal");
}
