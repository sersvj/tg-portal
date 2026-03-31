import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import {
  Stack, Box, Group, Text, Badge, Alert,
} from "@mantine/core";
import { LinkAnchor } from "@/components/ui/link-components";
import { ArrowLeft, CheckCircle, Upload, FileText, ImageIcon, Layers } from "lucide-react";
import { UploadForm } from "@/components/portal/upload-form";
import { MilestoneTypeBadge } from "@/components/ui/status-badge";
import { logMilestoneOpened, resolveClientActorName } from "@/lib/activity-log";
import { cookies } from "next/headers";

const typeIcons: Record<string, React.ElementType> = {
  brand_assets:         ImageIcon,
  content_docs:         FileText,
  supporting_materials: Layers,
};

export async function generateMetadata({ params }: { params: Promise<{ milestoneId: string }> }): Promise<Metadata> {
  const { milestoneId } = await params;
  const m = await db.clientMilestone.findUnique({ where: { id: milestoneId }, include: { milestoneDefinition: { select: { name: true } } } });
  return { title: m?.milestoneDefinition.name ?? "Upload" };
}

async function getMilestone(milestoneId: string, userId: string) {
  return db.clientMilestone.findFirst({
    where: {
      id: milestoneId,
      client: { clientUsers: { some: { userId } } },
    },
    include: {
      milestoneDefinition: { select: { name: true, description: true, type: true } },
      uploadedFiles: { orderBy: { uploadedAt: "desc" } },
    },
  });
}

async function getMilestoneForPreview(milestoneId: string) {
  return db.clientMilestone.findUnique({
    where: { id: milestoneId },
    include: {
      milestoneDefinition: { select: { name: true, description: true, type: true } },
      uploadedFiles: { orderBy: { uploadedAt: "desc" } },
    },
  });
}

export default async function UploadMilestonePage({
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

  if (!isPreview) {
    const user = await db.user.findUnique({ where: { id: session.user.id }, select: { name: true, email: true } });
    const actorEmail = user?.email ?? "";
    const actorName = await resolveClientActorName(actorEmail, milestone.clientId, user?.name ?? (actorEmail || session.user.id));
    await logMilestoneOpened({
      actorType: "CLIENT",
      actorId: session.user.id,
      actorName,
      actorEmail,
      action: "MILESTONE_OPENED",
      clientId: milestone.clientId,
      subject: { type: "MILESTONE", id: milestoneId, name: milestone.milestoneDefinition.name },
    });
  }

  if (milestone.milestoneDefinition.type === "questionnaire") {
    redirect(`/portal/questionnaire/${milestoneId}`);
  }
  if (milestone.milestoneDefinition.type === "staff_profiles") {
    redirect(`/portal/staff/${milestoneId}`);
  }
  if (milestone.milestoneDefinition.type === "page_content") {
    redirect(`/portal/page-content/${milestoneId}`);
  }

  const def         = milestone.milestoneDefinition;
  const Icon        = typeIcons[def.type] ?? Upload;
  const isCompleted = milestone.status === "COMPLETED";
  const isLocked    = milestone.status === "LOCKED";

  if (isLocked) {
    return (
      <Box maw={640} mx="auto" py={80} px="md" style={{ textAlign: "center" }}>
        <Text fw={600} c="gray.9" mb={4}>This milestone is locked</Text>
        <Text size="sm" c="gray.5" mb="md">Complete earlier milestones first.</Text>
        <LinkAnchor href="/portal" size="sm">← Back to portal</LinkAnchor>
      </Box>
    );
  }

  return (
    <Stack maw={640} mx="auto" py={{ base: "xl", sm: 48 }} px="md" gap="lg">

      {/* Back */}
      <LinkAnchor
        href="/portal"
        size="xs"
        c="gray.5"
        style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
      >
        <ArrowLeft size={11} /> All milestones
      </LinkAnchor>

      {/* Header */}
      <Group gap="md" align="flex-start" wrap="nowrap">
        <Box
          style={{
            width: 44, height: 44, flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            border: "1px solid var(--mantine-color-gray-2)",
            borderRadius: 4,
            background: "var(--mantine-color-gray-0)",
          }}
        >
          <Icon size={18} style={{ color: "var(--mantine-color-blue-5)" }} />
        </Box>
        <Box style={{ flex: 1 }}>
          <Group gap="xs" mb={6} wrap="wrap">
            <MilestoneTypeBadge type={def.type} />
            {isCompleted && (
              <Badge color="green" variant="light" size="xs"
                leftSection={<CheckCircle size={10} />}
              >
                Complete
              </Badge>
            )}
          </Group>
          <Text fw={700} fz={24} c="gray.9" style={{ letterSpacing: "-0.02em", lineHeight: 1.2 }}>
            {def.name}
          </Text>
          {def.description && (
            <Text size="sm" c="gray.5" mt={4}>{def.description}</Text>
          )}
        </Box>
      </Group>

      {/* Instructions */}
      {milestone.instructions && (
        <Alert color="blue" variant="light" title="Instructions">
          <Text size="sm" style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
            {milestone.instructions}
          </Text>
        </Alert>
      )}

      {/* Preview read-only state */}
      {isPreview && !isCompleted && (
        <Stack gap="md">
          {milestone.uploadedFiles.length > 0 ? (
            <Box style={{ border: "1px solid var(--mantine-color-gray-2)", borderRadius: 4, overflow: "hidden" }}>
              <Box px="md" py="xs" style={{ borderBottom: "1px solid var(--mantine-color-gray-1)", background: "var(--mantine-color-gray-0)" }}>
                <Text size="xs" fw={700} tt="uppercase" lts="0.1em" c="gray.5">
                  Uploaded ({milestone.uploadedFiles.length})
                </Text>
              </Box>
              <Stack gap={0}>
                {milestone.uploadedFiles.map((f, i) => (
                  <Group key={f.id} justify="space-between" px="md" py="sm" wrap="nowrap"
                    style={{ borderTop: i > 0 ? "1px solid var(--mantine-color-gray-1)" : undefined }}>
                    <Group gap="xs" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
                      <CheckCircle size={13} style={{ color: "var(--mantine-color-green-5)", flexShrink: 0 }} />
                      <Text size="sm" c="gray.8" truncate>{f.filename}</Text>
                    </Group>
                    <Text size="xs" c="gray.5" style={{ flexShrink: 0 }}>{(f.sizeBytes / 1024).toFixed(0)} KB</Text>
                  </Group>
                ))}
              </Stack>
            </Box>
          ) : (
            <Box px="md" py="xl" style={{ textAlign: "center", border: "2px dashed var(--mantine-color-gray-2)", borderRadius: 4 }}>
              <Text size="sm" c="gray.4">No files uploaded yet</Text>
            </Box>
          )}
          <Alert color="yellow" variant="light">
            <Text size="xs" c="yellow.8">File upload is disabled in preview mode.</Text>
          </Alert>
        </Stack>
      )}

      {/* Completed state */}
      {!isPreview && isCompleted ? (
        <Box
          style={{
            border: "1px solid var(--mantine-color-green-3)",
            borderRadius: 4,
            overflow: "hidden",
          }}
        >
          <Group
            gap="xs"
            px="md"
            py="sm"
            style={{ borderBottom: "1px solid var(--mantine-color-green-2)", background: "var(--mantine-color-green-0)" }}
          >
            <CheckCircle size={14} style={{ color: "var(--mantine-color-green-6)" }} />
            <Text size="sm" fw={600} c="green.7">
              {milestone.uploadedFiles.length} file{milestone.uploadedFiles.length !== 1 ? "s" : ""} submitted
            </Text>
          </Group>

          <Stack gap={0}>
            {milestone.uploadedFiles.map((f, i) => (
              <Group
                key={f.id}
                justify="space-between"
                px="md"
                py="sm"
                style={{
                  borderTop: i > 0 ? "1px solid var(--mantine-color-gray-1)" : undefined,
                }}
              >
                <Group gap="xs" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
                  <CheckCircle size={13} style={{ color: "var(--mantine-color-green-5)", flexShrink: 0 }} />
                  <Text size="sm" c="gray.8" truncate>{f.filename}</Text>
                </Group>
                <Text size="xs" c="gray.5" style={{ flexShrink: 0 }}>
                  {(f.sizeBytes / 1024).toFixed(0)} KB
                </Text>
              </Group>
            ))}
          </Stack>

          <Box
            px="md"
            py="sm"
            style={{
              borderTop: "1px solid var(--mantine-color-gray-1)",
              background: "var(--mantine-color-gray-0)",
            }}
          >
            <Text size="xs" c="gray.5">
              Your files have been submitted. Your account manager will review them and be in touch.
            </Text>
          </Box>
        </Box>
      ) : !isPreview ? (
        <UploadForm
          milestoneId={milestoneId}
          uploadedFiles={milestone.uploadedFiles.map((f) => ({
            id: f.id,
            filename: f.filename,
            sizeBytes: f.sizeBytes,
          }))}
          hasDropboxFolder={!!milestone.dropboxFolderPath}
        />
      ) : null}

    </Stack>
  );
}
