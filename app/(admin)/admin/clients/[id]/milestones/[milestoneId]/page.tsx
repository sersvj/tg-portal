import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { Stack, Group, Box, Text, Code } from "@mantine/core";
import { LinkAnchor } from "@/components/ui/link-components";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { EmptyState } from "@/components/ui/empty-state";
import { MilestoneStatusBadge } from "@/components/ui/status-badge";
import { FieldManager } from "@/components/admin/field-manager";
import { ResponseViewer } from "@/components/admin/response-viewer";
import { MilestoneConfigForm } from "@/components/admin/milestone-config-form";
import { StaffProfileViewer } from "@/components/admin/staff-profile-viewer";
import { ReopenButton } from "@/components/admin/reopen-button";
import { FileText, Users } from "lucide-react";
import { createClientField, updateClientField, deleteClientField, reorderClientFields, reopenMilestone } from "./actions";

async function getMilestone(milestoneId: string, clientId: string) {
  return db.clientMilestone.findFirst({
    where: { id: milestoneId, clientId },
    include: {
      client: { select: { companyName: true } },
      milestoneDefinition: { select: { name: true, type: true } },
      questionnaireFields: { orderBy: { order: "asc" } },
      uploadedFiles: { orderBy: { uploadedAt: "desc" } },
      staffProfiles: { orderBy: { order: "asc" } },
      questionnaireResponses: {
        orderBy: { submittedAt: "desc" },
        take: 1,
        include: { answers: true },
      },
    },
  });
}

export default async function ClientMilestoneDetailPage({
  params,
}: {
  params: Promise<{ id: string; milestoneId: string }>;
}) {
  const { id: clientId, milestoneId } = await params;
  const milestone = await getMilestone(milestoneId, clientId);
  if (!milestone) notFound();

  const { milestoneDefinition: def } = milestone;
  const isQuestionnaire  = def.type === "questionnaire";
  const isStaffProfiles  = def.type === "staff_profiles";
  const isCompleted      = milestone.status === "COMPLETED";
  const response         = milestone.questionnaireResponses[0] ?? null;

  const fieldActions = {
    create: async (formData: FormData) => {
      "use server";
      await createClientField(milestoneId, clientId, formData);
    },
    update: async (fieldId: string, formData: FormData) => {
      "use server";
      await updateClientField(fieldId, milestoneId, clientId, formData);
    },
    remove: async (fieldId: string) => {
      "use server";
      await deleteClientField(fieldId, milestoneId, clientId);
    },
    reorder: async (orderedIds: string[]) => {
      "use server";
      await reorderClientFields(milestoneId, clientId, orderedIds);
    },
  };

  const subtitle = isQuestionnaire
    ? isCompleted
      ? "Submitted questionnaire responses."
      : "Editing questionnaire fields for this client only — the default template is not affected."
    : isStaffProfiles
    ? isCompleted
      ? "Submitted staff profiles."
      : "Configure instructions and Dropbox folder for headshot uploads."
    : "Configure instructions and Dropbox folder for this milestone.";

  return (
    <Stack p={{ base: "md", sm: "xl" }} gap="lg" maw={1100}>
      <Box>
        <LinkAnchor
          href={`/admin/clients/${clientId}`}
          size="xs"
          c="gray.5"
          style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
        >
          <ArrowLeft size={11} /> {milestone.client.companyName}
        </LinkAnchor>
      </Box>

      <Group justify="space-between" align="flex-start">
        <PageHeader title={def.name} subtitle={subtitle} />
        <MilestoneStatusBadge status={milestone.status} />
      </Group>

      {/* ── Questionnaire ────────────────────────────── */}
      {isQuestionnaire && (
        isCompleted && response ? (
          <Stack gap="lg">
            <SectionCard
              title="Responses"
              description={`${milestone.questionnaireFields.filter((f) => !["PAGE_BREAK", "CONTENT"].includes(f.fieldType)).length} questions answered`}
            >
              <ResponseViewer
                milestoneName={def.name}
                clientName={milestone.client.companyName}
                submittedAt={response.submittedAt.toISOString()}
                fields={milestone.questionnaireFields.map((f) => ({
                  id: f.id, label: f.label, fieldType: f.fieldType, order: f.order,
                }))}
                answers={response.answers.map((a) => ({ fieldId: a.fieldId, value: a.value }))}
              />
            </SectionCard>
            <ReopenButton milestoneId={milestoneId} clientId={clientId} reopenAction={reopenMilestone} />
          </Stack>
        ) : isCompleted ? (
          <Stack gap="lg">
            <EmptyState
              icon={FileText}
              title="No responses recorded"
              description="This milestone is marked complete but has no submitted responses."
            />
            <ReopenButton milestoneId={milestoneId} clientId={clientId} reopenAction={reopenMilestone} />
          </Stack>
        ) : (
          <SectionCard
            title="Fields"
            description={`${milestone.questionnaireFields.length} field${milestone.questionnaireFields.length !== 1 ? "s" : ""} — changes apply to this client only.`}
          >
            <FieldManager fields={milestone.questionnaireFields} actions={fieldActions} />
          </SectionCard>
        )
      )}

      {/* ── Staff Profiles ───────────────────────────── */}
      {isStaffProfiles && (
        <Stack gap="lg">
          {isCompleted ? (
            <>
              <SectionCard
                title="Team Members"
                description={`${milestone.staffProfiles.length} submitted`}
                noPadding
              >
                {milestone.staffProfiles.length === 0 ? (
                  <EmptyState
                    icon={Users}
                    title="No profiles recorded"
                    description="This milestone is marked complete but has no submitted profiles."
                  />
                ) : (
                  <StaffProfileViewer profiles={milestone.staffProfiles} />
                )}
              </SectionCard>
              <ReopenButton milestoneId={milestoneId} clientId={clientId} reopenAction={reopenMilestone} />
            </>
          ) : (
            <SectionCard title="Configuration">
              <MilestoneConfigForm
                milestoneId={milestoneId}
                clientId={clientId}
                initialInstructions={milestone.instructions}
                initialFolderPath={milestone.dropboxFolderPath}
              />
            </SectionCard>
          )}
        </Stack>
      )}

      {/* ── Upload types ─────────────────────────────── */}
      {!isQuestionnaire && !isStaffProfiles && (
        <Stack gap="lg">
          {!isCompleted && (
            <SectionCard title="Configuration">
              <MilestoneConfigForm
                milestoneId={milestoneId}
                clientId={clientId}
                initialInstructions={milestone.instructions}
                initialFolderPath={milestone.dropboxFolderPath}
              />
            </SectionCard>
          )}

          {isCompleted && (
            <SectionCard
              title="Uploaded Files"
              description={`${milestone.uploadedFiles.length} file${milestone.uploadedFiles.length !== 1 ? "s" : ""}`}
              noPadding
            >
              {milestone.uploadedFiles.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="No files recorded"
                  description="No files were uploaded for this milestone."
                />
              ) : (
                <Stack gap={0}>
                  {milestone.uploadedFiles.map((f, i) => (
                    <Box
                      key={f.id}
                      px="md"
                      py="sm"
                      style={{
                        borderTop: i > 0 ? "1px solid var(--mantine-color-gray-1)" : undefined,
                      }}
                    >
                      <Group justify="space-between" align="flex-start" wrap="nowrap">
                        <Box style={{ minWidth: 0 }}>
                          <Text size="sm" fw={500} c="gray.9" truncate>{f.filename}</Text>
                          <Code fz="xs" c="gray.5" bg="transparent" style={{ display: "block" }}>
                            {f.dropboxPath}
                          </Code>
                        </Box>
                        <Box style={{ textAlign: "right", flexShrink: 0 }}>
                          <Text size="xs" c="gray.5">{(f.sizeBytes / 1024).toFixed(0)} KB</Text>
                          <Text size="xs" c="gray.4">
                            {new Date(f.uploadedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </Text>
                        </Box>
                      </Group>
                    </Box>
                  ))}
                </Stack>
              )}
            </SectionCard>
          )}
          {isCompleted && (
            <ReopenButton milestoneId={milestoneId} clientId={clientId} reopenAction={reopenMilestone} />
          )}
        </Stack>
      )}
    </Stack>
  );
}
