"use client";

import { useTransition, useState } from "react";
import {
  Stack, Group, Box, Text, TextInput, Textarea, Select, Checkbox,
  Button, ActionIcon, Badge, Tooltip,
} from "@mantine/core";
import { Plus, Trash2, Pencil, X, Check, AlignLeft, GripVertical } from "lucide-react";
import { FieldType } from "@prisma/client";
import { DEFAULT_LIKERT_SCALE } from "@/lib/field-options";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type Field = {
  id: string;
  label: string;
  fieldType: FieldType;
  options: unknown;
  required: boolean;
  helpText: string | null;
  order: number;
};

type Actions = {
  create: (formData: FormData) => Promise<void>;
  update: (fieldId: string, formData: FormData) => Promise<void>;
  remove: (fieldId: string) => Promise<void>;
  reorder: (orderedIds: string[]) => Promise<void>;
};

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: "TEXT",        label: "Short text" },
  { value: "TEXTAREA",    label: "Long text" },
  { value: "RADIO",       label: "Radio (single select)" },
  { value: "MULTISELECT", label: "Checkboxes (multi select)" },
  { value: "SELECT",      label: "Dropdown (single select)" },
  { value: "BOOLEAN",     label: "Yes / No" },
  { value: "LIKERT",      label: "Likert / Rating scale" },
  { value: "CONTENT",     label: "Content block (heading + text)" },
  { value: "PAGE_BREAK",  label: "Page break / Section" },
];

const TYPE_COLORS: Partial<Record<FieldType, string>> = {
  TEXT: "gray", TEXTAREA: "gray",
  SELECT: "blue", RADIO: "blue",
  MULTISELECT: "violet",
  BOOLEAN: "green",
  LIKERT: "yellow",
  CONTENT: "gray",
  PAGE_BREAK: "gray",
};

const TYPE_LABELS: Partial<Record<FieldType, string>> = {
  TEXT: "Short text", TEXTAREA: "Long text",
  SELECT: "Dropdown", RADIO: "Radio",
  MULTISELECT: "Checkboxes",
  BOOLEAN: "Yes / No",
  LIKERT: "Likert",
  CONTENT: "Content",
  PAGE_BREAK: "Page break",
};

function needsOptions(type: FieldType) {
  return type === "SELECT" || type === "RADIO" || type === "MULTISELECT";
}

function getLikertDefaults(raw: unknown): { scale: string; rows: string } {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>;
    return {
      scale: Array.isArray(obj.scale) ? (obj.scale as string[]).join(", ") : DEFAULT_LIKERT_SCALE.join(", "),
      rows:  Array.isArray(obj.rows)  ? (obj.rows as string[]).join("\n")  : "",
    };
  }
  return { scale: DEFAULT_LIKERT_SCALE.join(", "), rows: "" };
}

function FieldForm({
  defaultValues,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  defaultValues?: Partial<Field>;
  onSubmit: (formData: FormData) => void;
  onCancel?: () => void;
  submitLabel: string;
}) {
  const [fieldType, setFieldType] = useState<FieldType>(defaultValues?.fieldType ?? "TEXT");
  const likertDefaults = getLikertDefaults(defaultValues?.options);
  const isNonAnswerable = fieldType === "PAGE_BREAK" || fieldType === "CONTENT";

  const typeOptions = FIELD_TYPES.map((t) => ({ value: t.value, label: t.label }));

  const labelText =
    fieldType === "CONTENT"    ? "Heading" :
    fieldType === "PAGE_BREAK" ? "Section title" :
    "Label";

  const helpTextLabel =
    fieldType === "CONTENT"    ? "Body text" :
    fieldType === "PAGE_BREAK" ? "Section description" :
    "Help text";

  const helpTextPlaceholder =
    fieldType === "CONTENT"    ? "Paragraph shown below the heading" :
    fieldType === "PAGE_BREAK" ? "Brief intro shown at top of this section" :
    "Shown below the field label";

  return (
    <Box
      component="form"
      onSubmit={(e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        onSubmit(new FormData(e.currentTarget));
      }}
      p="sm"
      style={{
        background: "var(--mantine-color-gray-0)",
        border: "1px solid var(--mantine-color-gray-2)",
        borderRadius: 4,
      }}
    >
      <Stack gap="sm">
        <Group gap="sm" align="flex-end" wrap="wrap">
          <TextInput
            name="label"
            label={`${labelText} *`}
            placeholder={
              fieldType === "CONTENT"    ? "e.g. About your brand" :
              fieldType === "PAGE_BREAK" ? "e.g. Business Overview" :
              "e.g. Primary brand color"
            }
            defaultValue={defaultValues?.label}
            required
            size="sm"
            style={{ flex: 1, minWidth: 160 }}
          />
          <Select
            name="fieldType"
            label="Type"
            data={typeOptions}
            value={fieldType}
            onChange={(v) => setFieldType((v ?? "TEXT") as FieldType)}
            allowDeselect={false}
            size="sm"
            style={{ width: 200 }}
          />
        </Group>

        {needsOptions(fieldType) && (
          <TextInput
            name="options"
            label="Options (comma-separated)"
            placeholder="Option A, Option B, Option C"
            defaultValue={
              Array.isArray(defaultValues?.options)
                ? (defaultValues.options as string[]).join(", ")
                : ""
            }
            size="sm"
          />
        )}

        {fieldType === "LIKERT" && (
          <>
            <TextInput
              name="options"
              label="Scale labels (comma-separated, left → right)"
              placeholder="Strongly disagree, Disagree, Neutral, Agree, Strongly agree"
              defaultValue={likertDefaults.scale}
              size="sm"
            />
            <Textarea
              name="rows"
              label="Statements (one per line)"
              placeholder={"Our brand is clearly differentiated in the market\nOur messaging is consistent across all channels"}
              defaultValue={likertDefaults.rows}
              rows={4}
              size="sm"
            />
          </>
        )}

        <TextInput
          name="helpText"
          label={`${helpTextLabel} (optional)`}
          placeholder={helpTextPlaceholder}
          defaultValue={defaultValues?.helpText ?? ""}
          size="sm"
        />

        <Group justify="space-between">
          {!isNonAnswerable && fieldType !== "LIKERT" ? (
            <Checkbox
              name="required"
              label="Required"
              defaultChecked={defaultValues?.required ?? false}
              size="sm"
            />
          ) : <Box />}

          <Group gap="xs">
            {onCancel && (
              <Button
                type="button"
                variant="subtle"
                color="gray"
                size="xs"
                leftSection={<X size={12} />}
                onClick={onCancel}
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              size="xs"
              leftSection={<Check size={12} />}
            >
              {submitLabel}
            </Button>
          </Group>
        </Group>
      </Stack>
    </Box>
  );
}

// ─── Sortable row wrapper ────────────────────────────────────────────────────

function SortableRow({
  id,
  children,
}: {
  id: string;
  children: (dragHandle: React.ReactNode) => React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: "relative",
    zIndex: isDragging ? 10 : undefined,
  };

  const dragHandle = (
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
  );

  return (
    <Box ref={setNodeRef} style={style}>
      {children(dragHandle)}
    </Box>
  );
}

// ─── FieldManager ────────────────────────────────────────────────────────────

export function FieldManager({ fields, actions }: { fields: Field[]; actions: Actions }) {
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId]    = useState<string | null>(null);
  const [showAdd, setShowAdd]        = useState(false);
  const [items, setItems]            = useState<Field[]>(fields);

  const prevFieldsRef = useState<Field[]>(fields)[0];
  if (fields !== prevFieldsRef && fields.length !== items.length) {
    setItems(fields);
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((f) => f.id === active.id);
    const newIndex = items.findIndex((f) => f.id === over.id);
    const reordered = arrayMove(items, oldIndex, newIndex);
    setItems(reordered);
    startTransition(async () => { await actions.reorder(reordered.map((f) => f.id)); });
  }

  function handleCreate(formData: FormData) {
    startTransition(async () => {
      await actions.create(formData);
      setShowAdd(false);
    });
  }

  function handleUpdate(fieldId: string, formData: FormData) {
    startTransition(async () => {
      await actions.update(fieldId, formData);
      setEditingId(null);
    });
  }

  function handleDelete(fieldId: string) {
    startTransition(async () => {
      await actions.remove(fieldId);
      setItems((prev) => prev.filter((f) => f.id !== fieldId));
    });
  }

  return (
    <Stack gap="xs" style={{ opacity: isPending ? 0.6 : 1, pointerEvents: isPending ? "none" : undefined }}>
      {items.length === 0 && !showAdd && (
        <Text size="xs" c="gray.4" py="xs">No fields yet. Add one below.</Text>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((f) => f.id)} strategy={verticalListSortingStrategy}>
          {items.map((field) => {
            if (editingId === field.id) {
              return (
                <FieldForm
                  key={field.id}
                  defaultValues={field}
                  submitLabel="Save"
                  onSubmit={(fd) => handleUpdate(field.id, fd)}
                  onCancel={() => setEditingId(null)}
                />
              );
            }

            // PAGE_BREAK
            if (field.fieldType === "PAGE_BREAK") {
              return (
                <SortableRow key={field.id} id={field.id}>
                  {(dragHandle) => (
                    <Group gap="xs" my={2}>
                      {dragHandle}
                      <Box style={{ flex: 1, height: 1, background: "var(--mantine-color-gray-2)" }} />
                      <Group
                        gap="xs"
                        px="sm"
                        py={4}
                        style={{
                          border: "1px solid var(--mantine-color-gray-2)",
                          borderRadius: 4,
                          background: "var(--mantine-color-gray-0)",
                        }}
                      >
                        <Text size="xs" fw={700} tt="uppercase" lts="0.1em" c="gray.5">
                          {field.label || "Page break"}
                        </Text>
                        <ActionIcon variant="subtle" color="gray" size="xs"
                          onClick={() => { setEditingId(field.id); setShowAdd(false); }}>
                          <Pencil size={11} />
                        </ActionIcon>
                        <ActionIcon variant="subtle" color="red" size="xs"
                          onClick={() => handleDelete(field.id)}>
                          <Trash2 size={11} />
                        </ActionIcon>
                      </Group>
                      <Box style={{ flex: 1, height: 1, background: "var(--mantine-color-gray-2)" }} />
                    </Group>
                  )}
                </SortableRow>
              );
            }

            // CONTENT
            if (field.fieldType === "CONTENT") {
              return (
                <SortableRow key={field.id} id={field.id}>
                  {(dragHandle) => (
                    <Group
                      gap="xs"
                      px="sm"
                      py="xs"
                      style={{
                        border: "1px dashed var(--mantine-color-gray-2)",
                        borderRadius: 4,
                        background: "var(--mantine-color-gray-0)",
                      }}
                    >
                      {dragHandle}
                      <AlignLeft size={13} style={{ color: "var(--mantine-color-gray-4)", flexShrink: 0 }} />
                      <Box style={{ flex: 1, minWidth: 0 }}>
                        <Text size="sm" fw={500} c="gray.8" truncate>{field.label || "Content block"}</Text>
                        {field.helpText && (
                          <Text size="xs" c="gray.5" truncate>{field.helpText}</Text>
                        )}
                      </Box>
                      <Group gap={2} style={{ flexShrink: 0 }}>
                        <Tooltip label="Edit">
                          <ActionIcon variant="subtle" color="gray" size="sm"
                            onClick={() => { setEditingId(field.id); setShowAdd(false); }}>
                            <Pencil size={13} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Delete">
                          <ActionIcon variant="subtle" color="red" size="sm"
                            onClick={() => handleDelete(field.id)}>
                            <Trash2 size={13} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Group>
                  )}
                </SortableRow>
              );
            }

            // Regular field
            const typeColor = TYPE_COLORS[field.fieldType] ?? "gray";
            const typeLabel = TYPE_LABELS[field.fieldType] ?? field.fieldType;
            const likertOpts = field.fieldType === "LIKERT"
              ? (field.options as { rows?: string[] } | null)
              : null;

            return (
              <SortableRow key={field.id} id={field.id}>
                {(dragHandle) => (
                  <Group
                    gap="xs"
                    px="sm"
                    py="xs"
                    style={{
                      border: "1px solid var(--mantine-color-gray-2)",
                      borderRadius: 4,
                      background: "white",
                    }}
                  >
                    {dragHandle}
                    <Box style={{ flex: 1, minWidth: 0 }}>
                      <Group gap="xs" wrap="wrap">
                        <Text size="sm" fw={500} c="gray.9">{field.label}</Text>
                        {field.required && (
                          <Text size="xs" fw={600} c="orange.6">required</Text>
                        )}
                        <Badge color={typeColor} variant="light" size="xs">{typeLabel}</Badge>
                        {likertOpts && (likertOpts.rows?.length ?? 0) > 0 && (
                          <Text size="xs" c="gray.4">
                            {likertOpts.rows!.length} statement{likertOpts.rows!.length !== 1 ? "s" : ""}
                          </Text>
                        )}
                      </Group>
                      {field.helpText && (
                        <Text size="xs" c="gray.5" truncate>{field.helpText}</Text>
                      )}
                      {Array.isArray(field.options) && (field.options as string[]).length > 0 && (
                        <Text size="xs" c="gray.4" truncate>
                          {(field.options as string[]).join(", ")}
                        </Text>
                      )}
                    </Box>
                    <Group gap={2} style={{ flexShrink: 0 }}>
                      <Tooltip label="Edit">
                        <ActionIcon variant="subtle" color="gray" size="sm"
                          onClick={() => { setEditingId(field.id); setShowAdd(false); }}>
                          <Pencil size={13} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label="Delete">
                        <ActionIcon variant="subtle" color="red" size="sm"
                          onClick={() => handleDelete(field.id)}>
                          <Trash2 size={13} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Group>
                )}
              </SortableRow>
            );
          })}
        </SortableContext>
      </DndContext>

      {showAdd ? (
        <FieldForm
          submitLabel="Add field"
          onSubmit={handleCreate}
          onCancel={() => setShowAdd(false)}
        />
      ) : (
        <Button
          variant="subtle"
          color="gray"
          size="xs"
          leftSection={<Plus size={13} />}
          style={{ alignSelf: "flex-start" }}
          onClick={() => { setShowAdd(true); setEditingId(null); }}
        >
          Add field
        </Button>
      )}
    </Stack>
  );
}
