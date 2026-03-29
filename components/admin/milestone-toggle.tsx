"use client";

import { useTransition, useState, useEffect } from "react";
import {
  assignMilestone,
  removeMilestone,
  reorderClientMilestones,
} from "@/app/(admin)/admin/clients/[id]/actions";
import {
  Stack, Group, Text, Badge, ActionIcon, Button, Divider, Box, Tooltip,
} from "@mantine/core";
import {
  ClipboardList, Upload, ImageIcon, FileText, Settings2,
  GripVertical, X, Loader2, Plus,
} from "lucide-react";
import Link from "next/link";
import { MilestoneStatus } from "@prisma/client";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { EmptyState } from "@/components/ui/empty-state";

const typeIcons: Record<string, React.ElementType> = {
  questionnaire:        ClipboardList,
  brand_assets:         ImageIcon,
  content_docs:         FileText,
  supporting_materials: Upload,
};

const statusColor: Record<MilestoneStatus, string> = {
  ACTIVE:    "blue",
  COMPLETED: "green",
  LOCKED:    "gray",
};

type MilestoneDef       = { id: string; name: string; description: string | null; type: string };
type AssignedMilestone  = { id: string; milestoneDefinitionId: string; status: MilestoneStatus; order: number };

function SortableRow({
  clientId, def, clientMilestone, onRemove, pending,
}: {
  clientId: string;
  def: MilestoneDef;
  clientMilestone: AssignedMilestone;
  onRemove: () => void;
  pending: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: clientMilestone.id });

  const Icon = typeIcons[def.type] ?? ClipboardList;

  return (
    <Box
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        position: "relative",
        zIndex: isDragging ? 10 : undefined,
        borderLeft: `3px solid var(--mantine-color-${statusColor[clientMilestone.status]}-5)`,
      }}
    >
      <Group justify="space-between" px="md" py="sm" wrap="nowrap">
        {/* Left: drag + icon + name */}
        <Group gap="sm" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
          <ActionIcon
            variant="transparent"
            color="gray"
            size="sm"
            {...attributes}
            {...listeners}
            style={{ cursor: "grab", touchAction: "none" }}
            aria-label="Drag to reorder"
          >
            <GripVertical size={14} />
          </ActionIcon>
          <Icon size={14} style={{ color: "var(--mantine-color-gray-5)", flexShrink: 0 }} />
          <Text size="sm" fw={500} c="gray.9" truncate>
            {def.name}
          </Text>
        </Group>

        {/* Right: status + actions */}
        <Group gap="xs" wrap="nowrap" style={{ flexShrink: 0 }}>
          <Badge color={statusColor[clientMilestone.status]} variant="light" size="xs">
            {clientMilestone.status.toLowerCase()}
          </Badge>

          <Tooltip
            label={clientMilestone.status === "COMPLETED" && def.type === "questionnaire"
              ? "View responses" : def.type === "questionnaire" ? "Edit fields" : "Configure"}
          >
            <ActionIcon
              component={Link}
              href={`/admin/clients/${clientId}/milestones/${clientMilestone.id}`}
              variant="subtle"
              color={clientMilestone.status === "COMPLETED" ? "green" : "gray"}
              size="sm"
            >
              <Settings2 size={14} />
            </ActionIcon>
          </Tooltip>

          {clientMilestone.status !== "COMPLETED" && (
            <Tooltip label="Unassign">
              <ActionIcon
                variant="subtle"
                color="red"
                size="sm"
                disabled={pending}
                onClick={onRemove}
              >
                {pending ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />}
              </ActionIcon>
            </Tooltip>
          )}
        </Group>
      </Group>
    </Box>
  );
}

export function MilestoneToggle({ clientId, definitions, assigned }: {
  clientId: string;
  definitions: MilestoneDef[];
  assigned: AssignedMilestone[];
}) {
  const [pending, startTransition] = useTransition();
  const [assignedItems, setAssignedItems] = useState<AssignedMilestone[]>(
    [...assigned].sort((a, b) => a.order - b.order)
  );
  useEffect(() => { setAssignedItems([...assigned].sort((a, b) => a.order - b.order)); }, [assigned]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = assignedItems.findIndex((m) => m.id === active.id);
    const newIdx = assignedItems.findIndex((m) => m.id === over.id);
    const reordered = arrayMove(assignedItems, oldIdx, newIdx);
    setAssignedItems(reordered);
    startTransition(async () => { await reorderClientMilestones(clientId, reordered.map((m) => m.id)); });
  }

  const assignedDefIds  = new Set(assignedItems.map((m) => m.milestoneDefinitionId));
  const unassignedDefs  = definitions.filter((d) => !assignedDefIds.has(d.id));

  if (assignedItems.length === 0 && unassignedDefs.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="No milestone types yet"
        description="Create milestone types in the Milestones section first."
        action={
          <Button component={Link} href="/admin/milestones" variant="light" size="xs">
            Go to Milestones →
          </Button>
        }
      />
    );
  }

  return (
    <Stack gap={0} style={{ opacity: pending ? 0.6 : 1, pointerEvents: pending ? "none" : undefined }}>
      {/* Assigned — sortable */}
      {assignedItems.length > 0 && (
        <Box style={{ border: "1px solid var(--mantine-color-gray-2)", borderRadius: 4, overflow: "hidden" }}>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={assignedItems.map((m) => m.id)} strategy={verticalListSortingStrategy}>
              <Stack gap={0}>
                {assignedItems.map((cm, i) => {
                  const def = definitions.find((d) => d.id === cm.milestoneDefinitionId);
                  if (!def) return null;
                  return (
                    <Box key={cm.id} style={{ borderTop: i > 0 ? "1px solid var(--mantine-color-gray-1)" : undefined }}>
                      <SortableRow
                        clientId={clientId}
                        def={def}
                        clientMilestone={cm}
                        pending={pending}
                        onRemove={() => startTransition(() => removeMilestone(cm.id, clientId))}
                      />
                    </Box>
                  );
                })}
              </Stack>
            </SortableContext>
          </DndContext>
        </Box>
      )}

      {/* Available to assign */}
      {unassignedDefs.length > 0 && (
        <Box mt={assignedItems.length > 0 ? "lg" : 0}>
          <Text size="xs" fw={700} tt="uppercase" lts="0.08em" c="gray.5" mb="sm">
            Available to assign
          </Text>
          <Stack gap="xs">
            {unassignedDefs.map((def) => {
              const Icon = typeIcons[def.type] ?? ClipboardList;
              return (
                <Group
                  key={def.id}
                  justify="space-between"
                  px="md"
                  py="sm"
                  style={{
                    border: "1px solid var(--mantine-color-gray-2)",
                    borderRadius: 4,
                  }}
                >
                  <Group gap="sm">
                    <Icon size={14} style={{ color: "var(--mantine-color-gray-4)" }} />
                    <Text size="sm" c="gray.6">{def.name}</Text>
                  </Group>
                  <Button
                    variant="light"
                    size="xs"
                    leftSection={<Plus size={12} />}
                    disabled={pending}
                    onClick={() => startTransition(() => assignMilestone(clientId, def.id))}
                  >
                    Assign
                  </Button>
                </Group>
              );
            })}
          </Stack>
        </Box>
      )}
    </Stack>
  );
}
