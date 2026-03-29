import { Badge, type MantineColor } from "@mantine/core";
import { STATUS, MILESTONE_TYPE_COLOR } from "@/lib/theme";
import type { MilestoneStatus } from "@prisma/client";

// ── Milestone status badge ────────────────────────────────────────────────────
const STATUS_LABEL: Record<MilestoneStatus, string> = {
  ACTIVE:    "Active",
  COMPLETED: "Completed",
  LOCKED:    "Locked",
};

export function MilestoneStatusBadge({ status }: { status: MilestoneStatus }) {
  const color = STATUS[status.toLowerCase() as keyof typeof STATUS] as MantineColor;
  return (
    <Badge color={color} variant="light" radius="sm" size="sm">
      {STATUS_LABEL[status]}
    </Badge>
  );
}

// ── Milestone type badge ──────────────────────────────────────────────────────
const TYPE_LABEL: Record<string, string> = {
  questionnaire:        "Questionnaire",
  brand_assets:         "Brand Assets",
  content_docs:         "Content Docs",
  supporting_materials: "Supporting Materials",
};

export function MilestoneTypeBadge({ type }: { type: string }) {
  const color = (MILESTONE_TYPE_COLOR[type] ?? "gray") as MantineColor;
  const label = TYPE_LABEL[type] ?? type;
  return (
    <Badge color={color} variant="light" radius="sm" size="sm">
      {label}
    </Badge>
  );
}
