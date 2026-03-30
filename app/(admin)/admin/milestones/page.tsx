import type { Metadata } from "next";
import { db } from "@/lib/db";
import { Stack, Group, Table, TableThead, TableTbody, TableTr, TableTh, TableTd, Badge, Text, Box, Tooltip, Button } from "@mantine/core";
import { StatCard } from "@/components/ui/stat-card";
import { LinkActionIcon } from "@/components/ui/link-components";
import { Settings2, Flag } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { EmptyState } from "@/components/ui/empty-state";
import { MilestoneTypeBadge } from "@/components/ui/status-badge";
import { MilestoneDefinitionForm } from "@/components/admin/milestone-definition-form";
import { DeleteDefinitionButton } from "@/components/admin/delete-definition-button";
import { EditDefinitionButton } from "@/components/admin/edit-definition-button";
import { toggleMilestoneDefinition } from "./actions";

async function getDefinitions() {
  return db.milestoneDefinition.findMany({
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { clientMilestones: true } } },
  });
}

export const metadata: Metadata = { title: "Milestones" };

export default async function MilestonesPage() {
  const definitions = await getDefinitions();

  const active   = definitions.filter((d) => d.isActive).length;
  const inactive = definitions.filter((d) => !d.isActive).length;

  return (
    <Stack p={{ base: "md", sm: "xl" }} gap="xl" maw={1100}>
      <PageHeader
        title="Milestones"
        subtitle="Define the milestone types available to assign to clients"
      />

      <Group gap="xs">
        <StatCard label="Total Milestones"    value={definitions.length} color="gray.9" />
        <StatCard label="Active"              value={active}             color="blue" />
        {inactive > 0 && (
          <StatCard label="Inactive"          value={inactive}           color="gray.5" />
        )}
      </Group>

      <SectionCard
        title="Milestone Types"
        noPadding
      >
        {definitions.length === 0 ? (
          <EmptyState
            icon={Flag}
            title="No milestone types yet"
            description="Add your first one using the form below."
          />
        ) : (
          <Box style={{ overflowX: "auto" }}>
          <Table highlightOnHover horizontalSpacing="md" verticalSpacing="sm">
            <TableThead>
              <TableTr>
                <TableTh>Name</TableTh>
                <TableTh>Type</TableTh>
                <TableTh>In Use</TableTh>
                <TableTh style={{ textAlign: "right" }}>Actions</TableTh>
              </TableTr>
            </TableThead>
            <TableTbody>
              {definitions.map((def) => {
                const inUse = def._count.clientMilestones;
                return (
                  <TableTr
                    key={def.id}
                    style={{ opacity: def.isActive ? 1 : 0.45 }}
                  >
                    <TableTd>
                      <Text size="sm" fw={500} c="gray.9">{def.name}</Text>
                      {def.description && (
                        <Text size="xs" c="gray.5">{def.description}</Text>
                      )}
                    </TableTd>

                    <TableTd>
                      <MilestoneTypeBadge type={def.type} />
                    </TableTd>

                    <TableTd>
                      <Text size="sm" c="gray.6" ff="monospace">
                        {inUse > 0 ? inUse : "—"}
                      </Text>
                    </TableTd>

                    <TableTd>
                      <Group gap="xs" justify="flex-end" wrap="nowrap">
                        <EditDefinitionButton
                          id={def.id}
                          name={def.name}
                          description={def.description}
                        />

                        {def.type === "questionnaire" && (
                          <Tooltip label="Edit fields">
                            <LinkActionIcon
                              href={`/admin/milestones/${def.id}`}
                              variant="subtle"
                              color="violet"
                              size="sm"
                            >
                              <Settings2 size={14} />
                            </LinkActionIcon>
                          </Tooltip>
                        )}

                        <form
                          action={async () => {
                            "use server";
                            await toggleMilestoneDefinition(def.id, !def.isActive);
                          }}
                        >
                          <Button
                            type="submit"
                            variant="subtle"
                            color={def.isActive ? "gray" : "blue"}
                            size="xs"
                          >
                            {def.isActive ? "Deactivate" : "Activate"}
                          </Button>
                        </form>

                        <DeleteDefinitionButton id={def.id} name={def.name} inUse={inUse} />
                      </Group>
                    </TableTd>
                  </TableTr>
                );
              })}
            </TableTbody>
          </Table>
          </Box>
        )}
      </SectionCard>

      {/* Add form */}
      <SectionCard title="New Definition">
        <MilestoneDefinitionForm />
      </SectionCard>
    </Stack>
  );
}
