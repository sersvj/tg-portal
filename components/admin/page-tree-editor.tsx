"use client";

import { useState, useTransition } from "react";
import {
  Stack, Group, Box, Text, TextInput, Button, ActionIcon,
  Tooltip, Badge, Checkbox, Modal, Select, Alert, Collapse,
} from "@mantine/core";
import {
  FileText, Tag, Plus, Pencil, Trash2, Check, X, AlertCircle, ChevronDown, ChevronRight,
} from "lucide-react";
import { PageNodeType } from "@prisma/client";
import {
  createPageNode, updatePageNode, deletePageNode,
  createPageField, deletePageField,
} from "@/app/(admin)/admin/clients/[id]/milestones/[milestoneId]/actions";

type FieldTemplate = {
  id: string;
  label: string;
  fieldType: string;
  order: number;
};

type PageNode = {
  id: string;
  type: PageNodeType;
  title: string;
  isOptional: boolean;
  order: number;
  parentId: string | null;
  fieldTemplates: FieldTemplate[];
  children: PageNode[];
};

interface PageTreeEditorProps {
  milestoneId: string;
  clientId: string;
  initialNodes: PageNode[];
}

export function PageTreeEditor({ milestoneId, clientId, initialNodes }: PageTreeEditorProps) {
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editOptional, setEditOptional] = useState(false);
  const [addModal, setAddModal] = useState<{ parentId: string | null } | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState<PageNodeType>("PAGE");
  const [newOptional, setNewOptional] = useState(false);
  const [error, setError] = useState("");

  // Field add modal
  const [fieldModal, setFieldModal] = useState<{ nodeId: string } | null>(null);
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldType, setNewFieldType] = useState("TEXT");
  const [fieldError, setFieldError] = useState("");

  function openAdd(parentId: string | null) {
    setNewTitle("");
    setNewType("PAGE");
    setNewOptional(false);
    setError("");
    setAddModal({ parentId });
  }

  function openEdit(node: PageNode) {
    setEditingId(node.id);
    setEditTitle(node.title);
    setEditOptional(node.isOptional);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditTitle("");
  }

  function handleAdd() {
    if (!newTitle.trim()) { setError("Title is required."); return; }
    setError("");
    startTransition(async () => {
      try {
        await createPageNode(milestoneId, clientId, {
          title: newTitle,
          type: newType,
          parentId: addModal?.parentId ?? null,
          isOptional: newOptional,
        });
        setAddModal(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  function handleUpdate(nodeId: string) {
    if (!editTitle.trim()) return;
    startTransition(async () => {
      await updatePageNode(nodeId, milestoneId, clientId, {
        title: editTitle,
        isOptional: editOptional,
      });
      setEditingId(null);
    });
  }

  function handleDelete(nodeId: string) {
    startTransition(async () => {
      await deletePageNode(nodeId, milestoneId, clientId);
    });
  }

  function openAddField(nodeId: string) {
    setNewFieldLabel("");
    setNewFieldType("TEXT");
    setFieldError("");
    setFieldModal({ nodeId });
  }

  function handleAddField() {
    if (!newFieldLabel.trim()) { setFieldError("Label is required."); return; }
    setFieldError("");
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("label", newFieldLabel.trim());
        fd.set("fieldType", newFieldType);
        await createPageField(fieldModal!.nodeId, milestoneId, clientId, fd);
        setFieldModal(null);
      } catch (e) {
        setFieldError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  function handleDeleteField(fieldId: string) {
    startTransition(async () => {
      await deletePageField(fieldId, milestoneId, clientId);
    });
  }

  const rootNodes = [...initialNodes].sort((a, b) => a.order - b.order);

  return (
    <Stack gap="xs" style={{ opacity: isPending ? 0.6 : 1, pointerEvents: isPending ? "none" : undefined }}>
      {rootNodes.length === 0 && (
        <Text size="sm" c="gray.4" fs="italic">No pages added yet.</Text>
      )}

      {rootNodes.map((node) => (
        <Box key={node.id}>
          <NodeRow
            node={node}
            isEditing={editingId === node.id}
            editTitle={editTitle}
            editOptional={editOptional}
            onEditTitleChange={setEditTitle}
            onEditOptionalChange={setEditOptional}
            onOpenEdit={() => openEdit(node)}
            onCancelEdit={cancelEdit}
            onSaveEdit={() => handleUpdate(node.id)}
            onDelete={() => handleDelete(node.id)}
            onAddChild={() => openAdd(node.id)}
            onAddField={node.type === "PAGE" ? () => openAddField(node.id) : undefined}
            onDeleteField={handleDeleteField}
            isPending={isPending}
          />

          {/* Children */}
          {node.children.length > 0 && (
            <Stack gap={0} ml={24} mt={2}>
              {[...node.children].sort((a, b) => a.order - b.order).map((child) => (
                <NodeRow
                  key={child.id}
                  node={child}
                  isEditing={editingId === child.id}
                  editTitle={editTitle}
                  editOptional={editOptional}
                  onEditTitleChange={setEditTitle}
                  onEditOptionalChange={setEditOptional}
                  onOpenEdit={() => openEdit(child)}
                  onCancelEdit={cancelEdit}
                  onSaveEdit={() => handleUpdate(child.id)}
                  onDelete={() => handleDelete(child.id)}
                  onAddField={child.type === "PAGE" ? () => openAddField(child.id) : undefined}
                  onDeleteField={handleDeleteField}
                  isPending={isPending}
                />
              ))}
            </Stack>
          )}
        </Box>
      ))}

      <Button
        variant="default"
        size="xs"
        leftSection={<Plus size={12} />}
        onClick={() => openAdd(null)}
        style={{ alignSelf: "flex-start", cursor: "pointer" }}
        mt="xs"
      >
        Add page or label
      </Button>

      {/* Add page/label modal */}
      <Modal
        opened={!!addModal}
        onClose={() => setAddModal(null)}
        title={addModal?.parentId ? "Add sub-page" : "Add page or label"}
        size="sm"
        zIndex={300}
      >
        <Stack gap="sm">
          <TextInput
            label="Title"
            placeholder="e.g. About Us"
            value={newTitle}
            onChange={(e) => setNewTitle(e.currentTarget.value)}
            required
            size="sm"
            autoFocus
          />
          {!addModal?.parentId && (
            <Select
              label="Type"
              size="sm"
              value={newType}
              onChange={(v) => setNewType((v ?? "PAGE") as PageNodeType)}
              data={[
                { value: "PAGE", label: "Page — has content" },
                { value: "LABEL", label: "Label — section divider only" },
              ]}
            />
          )}
          {(newType === "PAGE" || addModal?.parentId) && (
            <Checkbox
              label="Optional"
              description="Client can leave this page empty and still submit"
              size="sm"
              checked={newOptional}
              onChange={(e) => setNewOptional(e.currentTarget.checked)}
            />
          )}
          {error && (
            <Alert icon={<AlertCircle size={14} />} color="red" variant="light" p="xs">
              <Text size="xs">{error}</Text>
            </Alert>
          )}
          <Group justify="flex-end" gap="sm">
            <Button variant="subtle" color="gray" size="sm" onClick={() => setAddModal(null)} type="button">
              Cancel
            </Button>
            <Button size="sm" loading={isPending} onClick={handleAdd}>
              Add
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Add field modal */}
      <Modal
        opened={!!fieldModal}
        onClose={() => setFieldModal(null)}
        title="Add field to page"
        size="sm"
        zIndex={300}
      >
        <Stack gap="sm">
          <TextInput
            label="Label"
            placeholder="e.g. Meta description"
            value={newFieldLabel}
            onChange={(e) => setNewFieldLabel(e.currentTarget.value)}
            required
            size="sm"
            autoFocus
          />
          <Select
            label="Type"
            size="sm"
            value={newFieldType}
            onChange={(v) => setNewFieldType(v ?? "TEXT")}
            data={[
              { value: "TEXT", label: "Short text" },
              { value: "TEXTAREA", label: "Long text" },
            ]}
          />
          {fieldError && (
            <Alert icon={<AlertCircle size={14} />} color="red" variant="light" p="xs">
              <Text size="xs">{fieldError}</Text>
            </Alert>
          )}
          <Group justify="flex-end" gap="sm">
            <Button variant="subtle" color="gray" size="sm" onClick={() => setFieldModal(null)} type="button">
              Cancel
            </Button>
            <Button size="sm" loading={isPending} onClick={handleAddField}>
              Add field
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}

function NodeRow({
  node, isEditing, editTitle, editOptional,
  onEditTitleChange, onEditOptionalChange,
  onOpenEdit, onCancelEdit, onSaveEdit, onDelete, onAddChild, onAddField, onDeleteField, isPending,
}: {
  node: PageNode;
  isEditing: boolean;
  editTitle: string;
  editOptional: boolean;
  onEditTitleChange: (v: string) => void;
  onEditOptionalChange: (v: boolean) => void;
  onOpenEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onDelete: () => void;
  onAddChild?: () => void;
  onAddField?: () => void;
  onDeleteField: (id: string) => void;
  isPending: boolean;
}) {
  const [fieldsOpen, setFieldsOpen] = useState(false);
  const Icon = node.type === "LABEL" ? Tag : FileText;
  const isLabel = node.type === "LABEL";

  return (
    <Box
      style={{
        border: "1px solid var(--mantine-color-gray-2)",
        borderRadius: 4,
        background: isLabel ? "var(--mantine-color-gray-0)" : "white",
        marginBottom: 4,
      }}
    >
      <Box px="sm" py={6}>
        {isEditing ? (
          <Stack gap="xs">
            <TextInput
              value={editTitle}
              onChange={(e) => onEditTitleChange(e.currentTarget.value)}
              size="xs"
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") onSaveEdit(); if (e.key === "Escape") onCancelEdit(); }}
            />
            {!isLabel && (
              <Checkbox
                label="Optional"
                size="xs"
                checked={editOptional}
                onChange={(e) => onEditOptionalChange(e.currentTarget.checked)}
              />
            )}
            <Group gap="xs">
              <ActionIcon size="sm" color="green" variant="light" onClick={onSaveEdit} style={{ cursor: "pointer" }}>
                <Check size={12} />
              </ActionIcon>
              <ActionIcon size="sm" color="gray" variant="subtle" onClick={onCancelEdit} style={{ cursor: "pointer" }}>
                <X size={12} />
              </ActionIcon>
            </Group>
          </Stack>
        ) : (
          <Group justify="space-between" wrap="nowrap">
            <Group gap="xs" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
              <Icon size={13} style={{ color: isLabel ? "var(--mantine-color-gray-5)" : "var(--mantine-color-indigo-5)", flexShrink: 0 }} />
              <Text
                size="sm"
                fw={isLabel ? 700 : 400}
                c={isLabel ? "gray.6" : "gray.9"}
                tt={isLabel ? "uppercase" : undefined}
                style={{ letterSpacing: isLabel ? "0.06em" : undefined, fontSize: isLabel ? 11 : undefined }}
                truncate
              >
                {node.title}
              </Text>
              {node.isOptional && (
                <Badge color="gray" variant="light" size="xs">Optional</Badge>
              )}
              {!isLabel && node.fieldTemplates.length > 0 && (
                <Badge color="indigo" variant="light" size="xs">{node.fieldTemplates.length} field{node.fieldTemplates.length !== 1 ? "s" : ""}</Badge>
              )}
            </Group>
            <Group gap={4} style={{ flexShrink: 0 }}>
              {onAddChild && (
                <Tooltip label="Add sub-page" withArrow>
                  <ActionIcon size="sm" variant="subtle" color="gray" onClick={onAddChild} style={{ cursor: "pointer" }}>
                    <Plus size={12} />
                  </ActionIcon>
                </Tooltip>
              )}
              {!isLabel && onAddField && (
                <Tooltip label="Add field" withArrow>
                  <ActionIcon
                    size="sm"
                    variant={fieldsOpen ? "light" : "subtle"}
                    color={fieldsOpen ? "indigo" : "gray"}
                    onClick={() => setFieldsOpen((v) => !v)}
                    style={{ cursor: "pointer" }}
                  >
                    {fieldsOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  </ActionIcon>
                </Tooltip>
              )}
              <Tooltip label="Edit" withArrow>
                <ActionIcon size="sm" variant="subtle" color="gray" onClick={onOpenEdit} style={{ cursor: "pointer" }}>
                  <Pencil size={12} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Delete" withArrow>
                <ActionIcon size="sm" variant="subtle" color="red" onClick={onDelete} disabled={isPending} style={{ cursor: "pointer" }}>
                  <Trash2 size={12} />
                </ActionIcon>
              </Tooltip>
            </Group>
          </Group>
        )}
      </Box>

      {/* Fields panel */}
      {!isLabel && onAddField && (
        <Collapse in={fieldsOpen}>
          <Box
            px="sm"
            pb="sm"
            style={{ borderTop: "1px solid var(--mantine-color-gray-1)" }}
          >
            <Text size="xs" fw={700} tt="uppercase" lts="0.08em" c="gray.5" mt="xs" mb={6}>
              Additional Fields
            </Text>
            <Stack gap={4}>
              {node.fieldTemplates.length === 0 && (
                <Text size="xs" c="gray.4" fs="italic">No extra fields — just the rich-text editor.</Text>
              )}
              {node.fieldTemplates.map((ft) => (
                <Group key={ft.id} justify="space-between" wrap="nowrap">
                  <Group gap={6} wrap="nowrap">
                    <Text size="xs" c="gray.8">{ft.label}</Text>
                    <Badge color="gray" variant="light" size="xs">{ft.fieldType}</Badge>
                  </Group>
                  <ActionIcon size="xs" variant="subtle" color="red" onClick={() => onDeleteField(ft.id)} style={{ cursor: "pointer" }}>
                    <Trash2 size={10} />
                  </ActionIcon>
                </Group>
              ))}
            </Stack>
            <Button
              size="xs"
              variant="subtle"
              color="indigo"
              leftSection={<Plus size={11} />}
              mt={8}
              onClick={onAddField}
              style={{ cursor: "pointer" }}
            >
              Add field
            </Button>
          </Box>
        </Collapse>
      )}
    </Box>
  );
}
