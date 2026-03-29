import type { Metadata } from "next";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { Stack, Group, Box, Text, Alert } from "@mantine/core";
import { LinkAnchor } from "@/components/ui/link-components";
import { ArrowLeft, Info } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { MilestoneTypeBadge } from "@/components/ui/status-badge";
import { FieldManager } from "@/components/admin/field-manager";
import {
  createTemplateField,
  updateTemplateField,
  deleteTemplateField,
  reorderTemplateFields,
} from "./actions";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const def = await db.milestoneDefinition.findUnique({ where: { id }, select: { name: true } });
  return { title: def?.name ?? "Milestone" };
}

async function getDefinition(id: string) {
  return db.milestoneDefinition.findUnique({
    where: { id },
    include: { questionnaireFields: { orderBy: { order: "asc" } } },
  });
}

export default async function MilestoneDefinitionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const definition = await getDefinition(id);
  if (!definition) notFound();

  const isQuestionnaire = definition.type === "questionnaire";

  const actions = {
    create: async (formData: FormData) => {
      "use server";
      await createTemplateField(id, formData);
    },
    update: async (fieldId: string, formData: FormData) => {
      "use server";
      await updateTemplateField(fieldId, id, formData);
    },
    remove: async (fieldId: string) => {
      "use server";
      await deleteTemplateField(fieldId, id);
    },
    reorder: async (orderedIds: string[]) => {
      "use server";
      await reorderTemplateFields(id, orderedIds);
    },
  };

  return (
    <Stack p={{ base: "md", sm: "xl" }} gap="lg" maw={900}>
      <Box>
        <LinkAnchor
          href="/admin/milestones"
          size="xs"
          c="gray.5"
          style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
        >
          <ArrowLeft size={11} /> Milestones
        </LinkAnchor>
      </Box>

      <Group justify="space-between" align="flex-start">
        <PageHeader
          title={definition.name}
          subtitle={definition.description ?? undefined}
        />
        <MilestoneTypeBadge type={definition.type} />
      </Group>

      {isQuestionnaire ? (
        <SectionCard
          title="Default Fields"
          description="These fields are cloned to each client when this milestone is assigned. Changes here only affect future assignments."
        >
          <FieldManager fields={definition.questionnaireFields} actions={actions} />
        </SectionCard>
      ) : (
        <Alert icon={<Info size={14} />} color="blue" variant="light">
          Field management is only available for questionnaire-type milestones.
        </Alert>
      )}
    </Stack>
  );
}
