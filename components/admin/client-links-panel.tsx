"use client";

import { useState, useTransition, useEffect } from "react";
import {
  createClientLink,
  deleteClientLink,
  reorderClientLinks,
} from "@/app/(admin)/admin/clients/[id]/actions";
import {
  Stack, Group, Text, TextInput, Textarea, Select, Button,
  ActionIcon, Alert, Box, Divider,
} from "@mantine/core";
import {
  Paintbrush, Globe, Layers, Presentation,
  GripVertical, Trash2, Plus, X, AlertCircle,
} from "lucide-react";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export const LINK_TYPE_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  WEBSITE_DESIGN:   { label: "Website Design",   icon: Paintbrush,   color: "var(--mantine-color-violet-6)" },
  STAGING_WEBSITE:  { label: "Staging Website",  icon: Globe,        color: "var(--mantine-color-blue-6)"   },
  DESIGN_MATERIALS: { label: "Design Materials", icon: Layers,       color: "var(--mantine-color-grape-6)"  },
  PRESENTATION:     { label: "Presentation",     icon: Presentation, color: "var(--mantine-color-teal-6)"   },
};

type ClientLink = {
  id: string;
  type: string;
  title: string;
  url: string;
  description: string | null;
  order: number;
};

function SortableLinkRow({
  link,
  onDelete,
  pending,
}: {
  link: ClientLink;
  onDelete: () => void;
  pending: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: link.id });

  const meta = LINK_TYPE_META[link.type] ?? LINK_TYPE_META.WEBSITE_DESIGN;
  const Icon = meta.icon;

  return (
    <Box
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        position: "relative",
        zIndex: isDragging ? 10 : undefined,
      }}
    >
      <Group justify="space-between" px="md" py="sm" wrap="nowrap" gap="sm">
        {/* Drag handle */}
        <ActionIcon
          variant="transparent"
          color="gray"
          size="sm"
          {...attributes}
          {...listeners}
          style={{ cursor: "grab", touchAction: "none", flexShrink: 0 }}
          aria-label="Drag to reorder"
        >
          <GripVertical size={14} />
        </ActionIcon>

        {/* Type icon */}
        <Box style={{ flexShrink: 0, display: "flex", alignItems: "center" }}>
          <Icon size={14} style={{ color: meta.color }} />
        </Box>

        {/* Title + URL */}
        <Box style={{ flex: 1, minWidth: 0 }}>
          <Text size="sm" fw={500} c="gray.9" truncate>{link.title}</Text>
          <Text size="xs" c="gray.4" truncate style={{ fontFamily: "monospace" }}>
            {link.url.replace(/^https?:\/\//, "").slice(0, 50)}
          </Text>
        </Box>

        {/* Delete */}
        <ActionIcon
          variant="subtle"
          color="red"
          size="sm"
          disabled={pending}
          onClick={onDelete}
          style={{ cursor: "pointer", flexShrink: 0 }}
          aria-label="Remove link"
        >
          <Trash2 size={13} />
        </ActionIcon>
      </Group>
    </Box>
  );
}

export function ClientLinksPanel({
  clientId,
  links: initialLinks,
}: {
  clientId: string;
  links: ClientLink[];
}) {
  const [pending, startTransition] = useTransition();
  const [links, setLinks] = useState<ClientLink[]>(
    [...initialLinks].sort((a, b) => a.order - b.order)
  );
  useEffect(() => {
    setLinks([...initialLinks].sort((a, b) => a.order - b.order));
  }, [initialLinks]);

  const [showForm, setShowForm]         = useState(false);
  const [type, setType]                 = useState<string | null>(null);
  const [title, setTitle]               = useState("");
  const [url, setUrl]                   = useState("");
  const [description, setDescription]   = useState("");
  const [error, setError]               = useState("");

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = links.findIndex((l) => l.id === active.id);
    const newIdx = links.findIndex((l) => l.id === over.id);
    const reordered = arrayMove(links, oldIdx, newIdx);
    setLinks(reordered);
    startTransition(async () => {
      await reorderClientLinks(clientId, reordered.map((l) => l.id));
    });
  }

  function handleDelete(linkId: string) {
    startTransition(async () => {
      await deleteClientLink(linkId, clientId);
    });
  }

  function handleSave() {
    if (!type || !title.trim() || !url.trim()) return;
    setError("");
    startTransition(async () => {
      try {
        await createClientLink(clientId, { type, title, url, description });
        setType(null);
        setTitle("");
        setUrl("");
        setDescription("");
        setShowForm(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to add link.");
      }
    });
  }

  function handleCancel() {
    setType(null);
    setTitle("");
    setUrl("");
    setDescription("");
    setError("");
    setShowForm(false);
  }

  return (
    <Stack gap={0} style={{ opacity: pending ? 0.6 : 1, pointerEvents: pending ? "none" : undefined }}>
      {/* Link rows */}
      {links.length > 0 && (
        <>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={links.map((l) => l.id)} strategy={verticalListSortingStrategy}>
              <Stack gap={0}>
                {links.map((link, i) => (
                  <Box key={link.id} style={{ borderTop: i > 0 ? "1px solid var(--mantine-color-gray-1)" : undefined }}>
                    <SortableLinkRow
                      link={link}
                      pending={pending}
                      onDelete={() => handleDelete(link.id)}
                    />
                  </Box>
                ))}
              </Stack>
            </SortableContext>
          </DndContext>

          {showForm && <Divider />}
        </>
      )}

      {/* Inline add form */}
      {showForm && (
        <Stack gap="xs" p="md">
          <Group grow gap="xs">
            <Select
              size="xs"
              placeholder="Type"
              data={Object.entries(LINK_TYPE_META).map(([value, { label }]) => ({ value, label }))}
              value={type}
              onChange={setType}
            />
            <TextInput
              size="xs"
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </Group>
          <TextInput
            size="xs"
            placeholder="https://..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            type="url"
          />
          <Textarea
            size="xs"
            placeholder="Short note or instruction (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            autosize
            minRows={2}
          />

          {error && (
            <Alert icon={<AlertCircle size={12} />} color="red" py="xs">
              {error}
            </Alert>
          )}

          <Group gap="xs">
            <Button
              size="xs"
              loading={pending}
              disabled={!type || !title.trim() || !url.trim()}
              onClick={handleSave}
            >
              Save link
            </Button>
            <Button size="xs" variant="subtle" color="gray" onClick={handleCancel}>
              Cancel
            </Button>
          </Group>
        </Stack>
      )}

      {/* Add link button */}
      {!showForm && (
        <Box px="md" py="sm" style={{ borderTop: links.length > 0 ? "1px solid var(--mantine-color-gray-1)" : undefined }}>
          <Button
            size="xs"
            variant="subtle"
            color="gray"
            leftSection={<Plus size={12} />}
            onClick={() => setShowForm(true)}
          >
            Add link
          </Button>
        </Box>
      )}
    </Stack>
  );
}
