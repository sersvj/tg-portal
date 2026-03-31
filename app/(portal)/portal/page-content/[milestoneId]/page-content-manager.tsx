"use client";

import { useState, useTransition, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Stack, Group, Box, Text, Button, Checkbox, Badge, ScrollArea, Alert, Textarea,
} from "@mantine/core";
import { Tag, CheckCircle } from "lucide-react";
import { PageNodeType } from "@prisma/client";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { savePageContent, savePageFieldAnswer, togglePageNA, submitPageContentMilestone } from "./actions";

type FieldTemplate = {
  id: string;
  label: string;
  fieldType: string;
  order: number;
};

type SavedAnswer = {
  fieldTemplateId: string;
  value: string;
};

type PageNode = {
  id: string;
  type: PageNodeType;
  title: string;
  isOptional: boolean;
  isNA: boolean;
  content: string | null;
  order: number;
  parentId: string | null;
  fields: FieldTemplate[];
  answers: SavedAnswer[];
  children: PageNode[];
};

interface PageContentManagerProps {
  milestoneId: string;
  initialNodes: PageNode[];
}

export function PageContentManager({ milestoneId, initialNodes }: PageContentManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [submitError, setSubmitError] = useState("");

  const pages = initialNodes
    .flatMap((n) => [n, ...n.children])
    .filter((n) => n.type === "PAGE");

  const [selectedId, setSelectedId] = useState<string | null>(pages[0]?.id ?? null);

  // Per-page content state
  const [contentMap, setContentMap] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const p of pages) map[p.id] = p.content ?? "";
    return map;
  });

  // Per-page NA state
  const [naMap, setNaMap] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    for (const p of pages) map[p.id] = p.isNA;
    return map;
  });

  // Field answer state — keyed by `${pageId}::${fieldId}`
  const [fieldAnswerMap, setFieldAnswerMap] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const p of pages) {
      for (const f of p.fields) {
        const saved = p.answers.find((a) => a.fieldTemplateId === f.id);
        map[`${p.id}::${f.id}`] = saved?.value ?? "";
      }
    }
    return map;
  });

  // Content save indicator
  const [saveState, setSaveState] = useState<Record<string, "idle" | "saving" | "saved">>({});
  const contentDebounce = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const fieldDebounce = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const selected = pages.find((p) => p.id === selectedId) ?? null;
  const selectedContent = selectedId ? (contentMap[selectedId] ?? "") : "";
  const selectedNA = selectedId ? (naMap[selectedId] ?? false) : false;
  const currentSaveState = selectedId ? (saveState[selectedId] ?? "idle") : "idle";

  function triggerContentSave(nodeId: string, content: string) {
    setSaveState((prev) => ({ ...prev, [nodeId]: "saving" }));
    startTransition(async () => {
      await savePageContent(milestoneId, nodeId, content);
      setSaveState((prev) => ({ ...prev, [nodeId]: "saved" }));
    });
  }

  const handleContentChange = useCallback((nodeId: string, html: string) => {
    setContentMap((prev) => ({ ...prev, [nodeId]: html }));
    if (contentDebounce.current[nodeId]) clearTimeout(contentDebounce.current[nodeId]);
    contentDebounce.current[nodeId] = setTimeout(() => triggerContentSave(nodeId, html), 400);
  }, [milestoneId]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleToggleNA(nodeId: string, checked: boolean) {
    setNaMap((prev) => ({ ...prev, [nodeId]: checked }));
    startTransition(async () => {
      await togglePageNA(milestoneId, nodeId, checked);
    });
  }

  // Field saves are fire-and-forget — no startTransition so they don't affect isPending
  // or interfere with nav clicks
  function handleFieldChange(pageId: string, fieldId: string, value: string) {
    setFieldAnswerMap((prev) => ({ ...prev, [`${pageId}::${fieldId}`]: value }));
    const key = `${pageId}::${fieldId}`;
    if (fieldDebounce.current[key]) clearTimeout(fieldDebounce.current[key]);
    fieldDebounce.current[key] = setTimeout(() => {
      void savePageFieldAnswer(milestoneId, pageId, fieldId, value);
    }, 600);
  }

  function handleFieldBlur(pageId: string, fieldId: string, value: string) {
    if (fieldDebounce.current[`${pageId}::${fieldId}`]) {
      clearTimeout(fieldDebounce.current[`${pageId}::${fieldId}`]);
      delete fieldDebounce.current[`${pageId}::${fieldId}`];
    }
    void savePageFieldAnswer(milestoneId, pageId, fieldId, value);
  }

  function handleSaveAndLeave() {
    for (const [nodeId, timer] of Object.entries(contentDebounce.current)) {
      clearTimeout(timer);
      void savePageContent(milestoneId, nodeId, contentMap[nodeId] ?? "");
    }
    for (const [key, timer] of Object.entries(fieldDebounce.current)) {
      clearTimeout(timer);
      const [pageId, fieldId] = key.split("::");
      void savePageFieldAnswer(milestoneId, pageId, fieldId, fieldAnswerMap[key] ?? "");
    }
    router.push("/portal");
  }

  function handleSubmit() {
    setSubmitError("");
    startTransition(async () => {
      try {
        for (const [nodeId, timer] of Object.entries(contentDebounce.current)) {
          clearTimeout(timer);
          await savePageContent(milestoneId, nodeId, contentMap[nodeId] ?? "");
        }
        contentDebounce.current = {};
        for (const [key, timer] of Object.entries(fieldDebounce.current)) {
          clearTimeout(timer);
          const [pageId, fieldId] = key.split("::");
          await savePageFieldAnswer(milestoneId, pageId, fieldId, fieldAnswerMap[key] ?? "");
        }
        fieldDebounce.current = {};
        await submitPageContentMilestone(milestoneId);
        router.push("/portal");
      } catch (e) {
        setSubmitError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      }
    });
  }

  const rootNodes = [...initialNodes].sort((a, b) => a.order - b.order);

  return (
    <Stack gap="lg">
      <Box
        style={{
          border: "1px solid var(--mantine-color-gray-2)",
          borderRadius: 4,
          background: "white",
          minHeight: 480,
          display: "flex",
        }}
      >
        {/* Left tree nav */}
        <Box style={{ width: 240, flexShrink: 0, borderRight: "1px solid var(--mantine-color-gray-2)" }}>
          <ScrollArea style={{ height: "100%" }}>
            <Stack gap={0}>
              {rootNodes.map((node) => (
                <Box key={node.id}>
                  {node.type === "LABEL" ? (
                    <Box px="md" py="xs">
                      <Group gap={4}>
                        <Tag size={11} style={{ color: "var(--mantine-color-gray-4)" }} />
                        <Text size="xs" fw={700} tt="uppercase" lts="0.08em" c="gray.5">{node.title}</Text>
                      </Group>
                    </Box>
                  ) : (
                    <NavRow
                      node={node}
                      selectedId={selectedId}
                      onSelect={setSelectedId}
                      contentMap={contentMap}
                      naMap={naMap}
                    />
                  )}
                  {node.children.length > 0 && (
                    [...node.children].sort((a, b) => a.order - b.order).map((child) => (
                      <Box key={child.id} pl="md">
                        <NavRow
                          node={child}
                          selectedId={selectedId}
                          onSelect={setSelectedId}
                          contentMap={contentMap}
                          naMap={naMap}
                        />
                      </Box>
                    ))
                  )}
                </Box>
              ))}
            </Stack>
          </ScrollArea>
        </Box>

        {/* Right editor panel */}
        <Box style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          {selected ? (
            <Stack gap="md" p="lg" style={{ flex: 1 }}>
              <Group justify="space-between" align="center">
                <Group gap="xs">
                  <Text fw={700} fz={15} c="gray.9">{selected.title}</Text>
                  {selected.isOptional && <Badge color="gray" variant="light" size="xs">Optional</Badge>}
                </Group>
                <Text size="xs" c={currentSaveState === "saving" ? "gray.4" : currentSaveState === "saved" ? "green.6" : "transparent"}>
                  {currentSaveState === "saving" ? "Saving…" : "Saved"}
                </Text>
              </Group>

              <Checkbox
                label="Mark as N/A — this page is not applicable"
                size="sm"
                checked={selectedNA}
                onChange={(e) => handleToggleNA(selected.id, e.currentTarget.checked)}
                style={{ cursor: "pointer" }}
              />

              {selectedNA ? (
                <Box
                  p="sm"
                  style={{
                    background: "var(--mantine-color-gray-0)",
                    border: "1px solid var(--mantine-color-gray-2)",
                    borderRadius: 4,
                  }}
                >
                  <Text size="sm" c="gray.5" fs="italic">
                    This page is marked as not applicable and will be skipped on submission.
                  </Text>
                </Box>
              ) : (
                <RichTextEditor
                  value={selectedContent}
                  onChange={(html) => handleContentChange(selected.id, html)}
                  placeholder="Write the content for this page…"
                  minHeight={240}
                />
              )}

              {selected.fields.length > 0 && !selectedNA && (
                <FieldAnswers
                  pageId={selected.id}
                  fields={selected.fields}
                  fieldAnswerMap={fieldAnswerMap}
                  onFieldChange={handleFieldChange}
                  onFieldBlur={handleFieldBlur}
                />
              )}
            </Stack>
          ) : (
            <Box p="lg">
              <Text size="sm" c="gray.4">Select a page to start editing.</Text>
            </Box>
          )}
        </Box>
      </Box>

      {submitError && (
        <Alert color="red" variant="light">
          <Text size="sm">{submitError}</Text>
        </Alert>
      )}

      <Stack gap="xs">
        <Button fullWidth variant="default" onClick={handleSaveAndLeave} disabled={isPending} style={{ cursor: "pointer" }}>
          Save &amp; come back later
        </Button>
        <Button fullWidth color="green" leftSection={<CheckCircle size={14} />} loading={isPending} onClick={handleSubmit} style={{ cursor: "pointer" }}>
          I&apos;m done — submit for review
        </Button>
      </Stack>
    </Stack>
  );
}

function NavRow({
  node, selectedId, onSelect, contentMap, naMap,
}: {
  node: PageNode;
  selectedId: string | null;
  onSelect: (id: string) => void;
  contentMap: Record<string, string>;
  naMap: Record<string, boolean>;
}) {
  const isSelected = node.id === selectedId;
  const isNA = naMap[node.id] ?? node.isNA;
  const content = contentMap[node.id] ?? node.content ?? "";
  const hasContent = content.trim() !== "" && content !== "<p></p>";

  return (
    <Box
      px="md"
      py="sm"
      onClick={() => onSelect(node.id)}
      style={{
        cursor: "pointer",
        borderLeft: `3px solid ${isSelected ? "var(--mantine-color-blue-5)" : "transparent"}`,
        background: isSelected ? "var(--mantine-color-blue-0)" : undefined,
        transition: "background 120ms",
      }}
    >
      <Group gap="xs" wrap="nowrap">
        <Box
          style={{
            width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
            background: isNA
              ? "var(--mantine-color-orange-4)"
              : hasContent
              ? "var(--mantine-color-green-5)"
              : "var(--mantine-color-gray-3)",
          }}
        />
        <Text size="sm" fw={isSelected ? 600 : 400} c={isSelected ? "blue.7" : "gray.8"} truncate>
          {node.title}
        </Text>
        {node.isOptional && (
          <Badge color="gray" variant="light" size="xs" style={{ flexShrink: 0 }}>Opt</Badge>
        )}
      </Group>
    </Box>
  );
}

function FieldAnswers({
  pageId, fields, fieldAnswerMap, onFieldChange, onFieldBlur,
}: {
  pageId: string;
  fields: FieldTemplate[];
  fieldAnswerMap: Record<string, string>;
  onFieldChange: (pageId: string, fieldId: string, value: string) => void;
  onFieldBlur: (pageId: string, fieldId: string, value: string) => void;
}) {
  return (
    <Stack gap="md">
      <Text size="xs" fw={700} tt="uppercase" lts="0.08em" c="gray.5">Additional Fields</Text>
      {[...fields].sort((a, b) => a.order - b.order).map((field) => {
        const key = `${pageId}::${field.id}`;
        const value = fieldAnswerMap[key] ?? "";
        const isRich = field.fieldType === "TEXTAREA";

        return (
          <Box key={field.id}>
            <Text size="xs" fw={600} c="gray.7" mb={6}>{field.label}</Text>
            {isRich ? (
              <RichTextEditor
                value={value}
                onChange={(html) => onFieldChange(pageId, field.id, html)}
                placeholder={`Enter ${field.label.toLowerCase()}…`}
                minHeight={140}
              />
            ) : (
              <Textarea
                value={value}
                onChange={(e) => onFieldChange(pageId, field.id, e.currentTarget.value)}
                onBlur={(e) => onFieldBlur(pageId, field.id, e.currentTarget.value)}
                autosize
                minRows={2}
                size="sm"
              />
            )}
          </Box>
        );
      })}
    </Stack>
  );
}
