import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { cookies } from "next/headers";
import { Stack, Box, Text, Group, Badge, Alert, ThemeIcon } from "@mantine/core";
import { LinkAnchor } from "@/components/ui/link-components";
import { ArrowLeft, CheckCircle, User } from "lucide-react";
import { MilestoneTypeBadge, MilestoneStatusBadge } from "@/components/ui/status-badge";
import { StaffManager } from "./staff-manager";

async function getMilestone(milestoneId: string, userId: string) {
  return db.clientMilestone.findFirst({
    where: {
      id: milestoneId,
      client: { clientUsers: { some: { userId } } },
    },
    include: {
      milestoneDefinition: { select: { name: true, description: true, type: true } },
      staffProfiles: { orderBy: { order: "asc" } },
    },
  });
}

async function getMilestoneForPreview(milestoneId: string) {
  return db.clientMilestone.findUnique({
    where: { id: milestoneId },
    include: {
      milestoneDefinition: { select: { name: true, description: true, type: true } },
      staffProfiles: { orderBy: { order: "asc" } },
    },
  });
}

export default async function StaffMilestonePage({
  params,
}: {
  params: Promise<{ milestoneId: string }>;
}) {
  const { milestoneId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const cookieStore = await cookies();
  const previewClientId = cookieStore.get("tg-portal-preview")?.value;
  const isPreview = !!previewClientId && session.user.role === "ADMIN";

  const milestone = isPreview
    ? await getMilestoneForPreview(milestoneId)
    : await getMilestone(milestoneId, session.user.id);

  if (!milestone) notFound();
  if (milestone.milestoneDefinition.type !== "staff_profiles") {
    redirect(`/portal/upload/${milestoneId}`);
  }

  const { milestoneDefinition: def, staffProfiles, status } = milestone;
  const isCompleted = status === "COMPLETED";

  return (
    <Box maw={640} mx="auto" py={{ base: "xl", sm: 56 }} px="md">
      <Stack gap="lg">
        {/* Back + badges */}
        <Box>
          <LinkAnchor
            href="/portal"
            size="xs"
            c="gray.5"
            style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
          >
            <ArrowLeft size={11} /> Back to portal
          </LinkAnchor>
        </Box>

        <Group justify="space-between" align="flex-start">
          <Box>
            <Text fw={800} fz={28} c="gray.9" style={{ letterSpacing: "-0.02em", lineHeight: 1.1 }}>
              {def.name}
            </Text>
            {def.description && (
              <Text size="sm" c="gray.5" mt={6}>{def.description}</Text>
            )}
          </Box>
          <Group gap="xs">
            <MilestoneTypeBadge type={def.type} />
            <MilestoneStatusBadge status={status} />
          </Group>
        </Group>

        {/* Instructions */}
        {milestone.instructions && (
          <Alert color="blue" variant="light" title="Instructions">
            <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>{milestone.instructions}</Text>
          </Alert>
        )}

        {/* Preview notice */}
        {isPreview && (
          <Alert color="yellow" variant="light">
            <Text size="sm">Staff profile submission is disabled in preview mode.</Text>
          </Alert>
        )}

        {/* Completed — read-only */}
        {isCompleted ? (
          <Stack gap="md">
            <Group gap="xs">
              <CheckCircle size={14} style={{ color: "var(--mantine-color-green-6)" }} />
              <Text size="sm" fw={600} c="green.7">
                Submitted — {staffProfiles.length} team member{staffProfiles.length !== 1 ? "s" : ""}
              </Text>
            </Group>
            {staffProfiles.map((p) => (
              <Box
                key={p.id}
                p="md"
                style={{
                  border: "1px solid var(--mantine-color-gray-2)",
                  borderRadius: 4,
                  background: "white",
                }}
              >
                <Group gap="xs" wrap="nowrap" mb={4}>
                  <User size={14} style={{ color: "var(--mantine-color-gray-4)", flexShrink: 0 }} />
                  <Text size="sm" fw={600} c="gray.9">{p.name}</Text>
                  {p.title && <Text size="sm" c="gray.5">· {p.title}</Text>}
                </Group>
                {p.bio && (
                  <Box
                    mt={4}
                    style={{ fontSize: 13, color: "var(--mantine-color-gray-6)", lineHeight: 1.6 }}
                    dangerouslySetInnerHTML={{ __html: p.bio }}
                  />
                )}
                <Group gap="xs" mt={6}>
                  {p.noHeadshot ? (
                    <Badge color="gray" variant="light" size="xs">No headshot</Badge>
                  ) : p.headshotFilename ? (
                    <Badge color="teal" variant="light" size="xs">{p.headshotFilename}</Badge>
                  ) : null}
                </Group>
              </Box>
            ))}
          </Stack>
        ) : isPreview ? (
          // Preview + not completed: show read-only list if profiles exist
          staffProfiles.length > 0 ? (
            <Stack gap="xs">
              {staffProfiles.map((p) => (
                <Box
                  key={p.id}
                  p="md"
                  style={{
                    border: "1px solid var(--mantine-color-gray-2)",
                    borderRadius: 4,
                    background: "white",
                  }}
                >
                  <Text size="sm" fw={600} c="gray.9">{p.name}</Text>
                  {p.title && <Text size="xs" c="gray.5">{p.title}</Text>}
                </Box>
              ))}
            </Stack>
          ) : (
            <Text size="sm" c="gray.5">No team members added yet.</Text>
          )
        ) : (
          // Active — editable
          <StaffManager
            milestoneId={milestoneId}
            initialProfiles={staffProfiles}
            hasDropboxFolder={!!milestone.dropboxFolderPath}
          />
        )}
      </Stack>
    </Box>
  );
}
