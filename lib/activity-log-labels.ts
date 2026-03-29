export type LogEntry = {
  action: string;
  actorType: string;
  actorName: string;
  actorEmail: string;
  subjectName: string | null;
  subjectType: string | null;
  metadata: unknown;
};

export function describeAction(entry: LogEntry): string {
  const s = entry.subjectName ? `"${entry.subjectName}"` : "";
  const meta = entry.metadata as Record<string, unknown> | null;

  const map: Record<string, string> = {
    CLIENT_CREATED:            `Created client ${s}`,
    CLIENT_UPDATED:            `Updated client ${s}`,
    CLIENT_DEACTIVATED:        `Deactivated client ${s}`,
    CLIENT_REACTIVATED:        `Reactivated client ${s}`,
    CLIENT_INVITED:            `Sent portal invite to ${s}`,
    MILESTONE_ASSIGNED:        `Assigned milestone ${s}`,
    MILESTONE_UNASSIGNED:      `Removed milestone ${s}`,
    LINK_ADDED:                `Added link ${s}`,
    LINK_DELETED:              `Removed link ${s}`,
    ADMIN_INVITED:             `Invited ${s} as admin`,
    ADMIN_INVITE_REVOKED:      `Revoked invite for ${s}`,
    ADMIN_REMOVED:             `Removed admin ${s}`,
    DEFINITION_CREATED:        `Created milestone type ${s}`,
    DEFINITION_UPDATED:        `Updated milestone type ${s}`,
    DEFINITION_ACTIVATED:      `Activated milestone type ${s}`,
    DEFINITION_DEACTIVATED:    `Deactivated milestone type ${s}`,
    DEFINITION_DELETED:        `Deleted milestone type ${s}`,
    CLIENT_LOGIN:              `Signed in to portal`,
    MILESTONE_OPENED:          `Opened ${s} for the first time`,
    QUESTIONNAIRE_DRAFT_SAVED: `Saved progress on ${s}`,
    QUESTIONNAIRE_SUBMITTED:   `Submitted ${s}`,
    FILES_UPLOADED:            `Uploaded ${meta?.count ?? 1} file${(meta?.count ?? 1) !== 1 ? "s" : ""} to ${s}`,
    UPLOAD_SUBMITTED:          `Completed ${s}`,
  };

  return map[entry.action] ?? entry.action;
}

export function formatLogTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);

  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;

  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export function formatLogDate(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (d.getTime() === today.getTime()) return "Today";
  if (d.getTime() === yesterday.getTime()) return "Yesterday";
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export function groupLogsByDate<T extends { createdAt: Date }>(
  entries: T[]
): { label: string; entries: T[] }[] {
  const groups: { label: string; entries: T[] }[] = [];
  for (const entry of entries) {
    const label = formatLogDate(entry.createdAt);
    const last = groups[groups.length - 1];
    if (last?.label === label) {
      last.entries.push(entry);
    } else {
      groups.push({ label, entries: [entry] });
    }
  }
  return groups;
}
