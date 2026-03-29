import { db } from "@/lib/db";

export type LogAction =
  | "CLIENT_CREATED" | "CLIENT_UPDATED"
  | "CLIENT_DEACTIVATED" | "CLIENT_REACTIVATED"
  | "CLIENT_INVITED"
  | "MILESTONE_ASSIGNED" | "MILESTONE_UNASSIGNED"
  | "LINK_ADDED" | "LINK_DELETED"
  | "ADMIN_INVITED" | "ADMIN_INVITE_REVOKED" | "ADMIN_REMOVED"
  | "DEFINITION_CREATED" | "DEFINITION_UPDATED"
  | "DEFINITION_ACTIVATED" | "DEFINITION_DEACTIVATED" | "DEFINITION_DELETED"
  | "CLIENT_LOGIN"
  | "MILESTONE_OPENED"
  | "QUESTIONNAIRE_DRAFT_SAVED" | "QUESTIONNAIRE_SUBMITTED"
  | "FILES_UPLOADED" | "UPLOAD_SUBMITTED"
  | (string & {});

export interface LogPayload {
  actorType: "ADMIN" | "CLIENT" | "SYSTEM";
  actorId: string;
  actorName: string;
  actorEmail: string;
  action: LogAction;
  clientId?: string;
  subject?: { type: string; id: string; name: string };
  metadata?: Record<string, unknown>;
}

export async function logActivity(payload: LogPayload): Promise<void> {
  try {
    await db.activityLog.create({
      data: {
        actorType: payload.actorType,
        actorId: payload.actorId,
        actorName: payload.actorName,
        actorEmail: payload.actorEmail,
        action: payload.action,
        clientId: payload.clientId ?? null,
        subjectType: payload.subject?.type ?? null,
        subjectId: payload.subject?.id ?? null,
        subjectName: payload.subject?.name ?? null,
        metadata: (payload.metadata ?? undefined) as never,
      },
    });
  } catch {
    // Never throw — logging must never break the actual action
  }
}

/**
 * For CLIENT actors: looks up the ClientContact whose email matches the user's email.
 * Falls back to the provided fallback string (user.name or email).
 */
export async function resolveClientActorName(
  email: string,
  clientId: string | null | undefined,
  fallback: string,
): Promise<string> {
  if (!email || !clientId) return fallback;
  try {
    const contact = await db.clientContact.findFirst({
      where: { email, clientId },
      select: { name: true },
    });
    return contact?.name ?? fallback;
  } catch {
    return fallback;
  }
}

/** Only logs MILESTONE_OPENED once per actor+milestone combination. */
export async function logMilestoneOpened(
  payload: LogPayload & { subject: { type: string; id: string; name: string } }
): Promise<void> {
  try {
    const existing = await db.activityLog.findFirst({
      where: {
        action: "MILESTONE_OPENED",
        actorId: payload.actorId,
        subjectId: payload.subject.id,
      },
      select: { id: true },
    });
    if (!existing) {
      await logActivity(payload);
    }
  } catch {
    // Never throw
  }
}
