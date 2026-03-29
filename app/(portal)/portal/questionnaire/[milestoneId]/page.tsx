import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { Stack, Box, Text, Group } from "@mantine/core";
import { LinkAnchor, LinkButton } from "@/components/ui/link-components";
import { ArrowLeft, ChevronRight, CheckCircle } from "lucide-react";
import { QuestionnaireForm } from "@/components/portal/questionnaire-form";
import { BRAND } from "@/lib/theme";
import { logMilestoneOpened, resolveClientActorName } from "@/lib/activity-log";
import { cookies } from "next/headers";
import { Alert } from "@mantine/core";

export async function generateMetadata({ params }: { params: Promise<{ milestoneId: string }> }): Promise<Metadata> {
  const { milestoneId } = await params;
  const m = await db.clientMilestone.findUnique({ where: { id: milestoneId }, include: { milestoneDefinition: { select: { name: true } } } });
  return { title: m?.milestoneDefinition.name ?? "Questionnaire" };
}

async function getMilestone(id: string, userId: string) {
  return db.clientMilestone.findFirst({
    where: {
      id,
      milestoneDefinition: { type: "questionnaire" },
      client: { clientUsers: { some: { userId } } },
    },
    include: {
      milestoneDefinition: { select: { name: true, description: true } },
      questionnaireFields: {
        where: { isActive: true },
        orderBy: { order: "asc" },
      },
    },
  });
}

async function getMilestoneForPreview(id: string) {
  return db.clientMilestone.findUnique({
    where: { id },
    include: {
      milestoneDefinition: { select: { name: true, description: true } },
      questionnaireFields: {
        where: { isActive: true },
        orderBy: { order: "asc" },
      },
    },
  });
}

export default async function QuestionnairePage({
  params,
}: {
  params: Promise<{ milestoneId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) return null;

  const { milestoneId } = await params;

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

  const isCompleted = milestone.status === "COMPLETED";
  const def         = milestone.milestoneDefinition;
  const hasRequired = milestone.questionnaireFields.some((f) => f.required);

  return (
    <Stack maw={640} mx="auto" py={{ base: "xl", sm: 56 }} px="md" gap="lg">

      {/* Back */}
      <LinkAnchor
        href="/portal"
        size="xs"
        c="gray.5"
        style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
      >
        <ArrowLeft size={11} /> Back to portal
      </LinkAnchor>

      {/* Header */}
      <Box>
        <Text
          size="xs"
          fw={700}
          tt="uppercase"
          lts="0.2em"
          mb="xs"
          style={{ color: BRAND.orange }}
        >
          Questionnaire
        </Text>
        <Text
          fw={800}
          fz={{ base: 26, sm: 32 }}
          c="gray.9"
          style={{ letterSpacing: "-0.025em", lineHeight: 1.15 }}
        >
          {def.name}
        </Text>
        {def.description && (
          <Text size="sm" c="gray.5" mt="xs" style={{ lineHeight: 1.6 }}>
            {def.description}
          </Text>
        )}
        {milestone.questionnaireFields.length > 0 && (
          <Text size="xs" c="gray.4" mt="xs">
            {milestone.questionnaireFields.length} question{milestone.questionnaireFields.length !== 1 ? "s" : ""}
            {hasRequired && " — fields marked * are required"}
          </Text>
        )}
      </Box>

      {/* Completed state */}
      {isCompleted && (
        <Box
          p="xl"
          style={{
            border: "1px solid var(--mantine-color-green-3)",
            borderRadius: 4,
            background: "var(--mantine-color-green-0)",
            textAlign: "center",
          }}
        >
          <CheckCircle size={18} style={{ color: "var(--mantine-color-green-6)", margin: "0 auto 12px" }} />
          <Text fw={600} c="gray.9" mb={4}>Already submitted</Text>
          <Text size="sm" c="gray.5" mb="md">
            This questionnaire has been completed.
          </Text>
          {!isPreview && (
            <LinkButton href="/portal" variant="light" color="green" size="xs" rightSection={<ChevronRight size={12} />}>
              Back to portal
            </LinkButton>
          )}
        </Box>
      )}

      {/* Preview: read-only field list */}
      {isPreview && !isCompleted && (
        <Stack gap={0} style={{ border: "1px solid var(--mantine-color-gray-2)", borderRadius: 4, overflow: "hidden" }}>
          {milestone.questionnaireFields.filter((f) => f.fieldType !== "PAGE_BREAK").map((f, i) => (
            <Box
              key={f.id}
              px="md"
              py="sm"
              style={{ borderTop: i > 0 ? "1px solid var(--mantine-color-gray-1)" : undefined }}
            >
              <Group gap="xs" align="center" mb={f.helpText ? 2 : 0}>
                <Text size="sm" fw={600} c="gray.9">{f.label}</Text>
                {f.required && <Text size="xs" c="red.5">*</Text>}
                <Text size="xs" c="gray.4" ff="monospace">{f.fieldType.toLowerCase()}</Text>
              </Group>
              {f.helpText && <Text size="xs" c="gray.5">{f.helpText}</Text>}
            </Box>
          ))}
          <Box px="md" py="sm" style={{ background: "var(--mantine-color-gray-0)", borderTop: "1px solid var(--mantine-color-gray-1)" }}>
            <Alert color="yellow" variant="light" p="xs">
              <Text size="xs" c="yellow.8">Form submission is disabled in preview mode.</Text>
            </Alert>
          </Box>
        </Stack>
      )}

      {/* Live form */}
      {!isPreview && !isCompleted && (
        <QuestionnaireForm
          milestoneId={milestone.id}
          fields={milestone.questionnaireFields}
          draftAnswers={(milestone.draftAnswers as Record<string, unknown>) ?? {}}
        />
      )}

    </Stack>
  );
}
