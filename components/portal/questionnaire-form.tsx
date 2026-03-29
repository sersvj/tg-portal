"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Stack, Box, Group, Text, Button, Progress, TextInput, Textarea,
  Select, Radio, Checkbox, Alert,
} from "@mantine/core";
import { ArrowRight, ArrowLeft, CheckCircle, Pencil, AlertCircle } from "lucide-react";
import { submitQuestionnaire, saveQuestionnaireDraft } from "@/app/(portal)/portal/questionnaire/[milestoneId]/actions";
import { FieldType } from "@prisma/client";
import { DEFAULT_LIKERT_SCALE } from "@/lib/field-options";
import { EmptyState } from "@/components/ui/empty-state";
import { ClipboardList } from "lucide-react";

type Field = {
  id: string;
  label: string;
  fieldType: FieldType;
  options: unknown;
  required: boolean;
  helpText: string | null;
  order: number;
};

type Page = {
  sectionTitle: string | null;
  sectionDesc: string | null;
  fields: Field[];
};

type LikertAnswer = Record<string, string>;
type AnswerValue  = string | string[] | boolean | LikertAnswer;
type Answers      = Record<string, AnswerValue>;

const NON_ANSWERABLE: FieldType[] = ["PAGE_BREAK", "CONTENT"];

function parsePages(allFields: Field[]): Page[] {
  const pages: Page[] = [];
  let currentTitle: string | null = null;
  let currentDesc: string | null  = null;
  let currentFields: Field[]      = [];
  for (const field of allFields) {
    if (field.fieldType === "PAGE_BREAK") {
      pages.push({ sectionTitle: currentTitle, sectionDesc: currentDesc, fields: currentFields });
      currentTitle  = field.label || null;
      currentDesc   = field.helpText || null;
      currentFields = [];
    } else {
      currentFields.push(field);
    }
  }
  pages.push({ sectionTitle: currentTitle, sectionDesc: currentDesc, fields: currentFields });
  return pages.filter((p) => p.fields.length > 0);
}

function getOptions(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw as string[];
  return [];
}

function getLikertOptions(raw: unknown): { scale: string[]; rows: string[] } {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>;
    return {
      scale: Array.isArray(obj.scale) ? (obj.scale as string[]) : DEFAULT_LIKERT_SCALE,
      rows:  Array.isArray(obj.rows)  ? (obj.rows as string[])  : [],
    };
  }
  return { scale: DEFAULT_LIKERT_SCALE, rows: [] };
}

function formatAnswer(field: Field, value: AnswerValue | undefined): string {
  if (value === undefined || value === "" || (Array.isArray(value) && value.length === 0)) return "—";
  if (field.fieldType === "BOOLEAN") return value ? "Yes" : "No";
  if (field.fieldType === "LIKERT") {
    const opts = getLikertOptions(field.options);
    const ans  = (value as LikertAnswer) ?? {};
    if (!ans || Object.keys(ans).length === 0) return "—";
    return opts.rows.map((row, i) => `${row}: ${ans[String(i)] ?? "—"}`).join("\n");
  }
  if (Array.isArray(value)) return value.join(", ");
  return value as string;
}

// ── Field components ──────────────────────────────────────────────────────────

type InputProps = {
  field: Field;
  value: AnswerValue | undefined;
  onChange: (val: AnswerValue) => void;
  error?: string;
};

function FieldInput({ field, value, onChange, error }: InputProps) {
  const { fieldType, options } = field;

  if (fieldType === "TEXTAREA") {
    return (
      <Textarea
        value={(value as string) ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Your answer…"
        error={error}
        autosize
        minRows={3}
      />
    );
  }

  if (fieldType === "SELECT") {
    const opts = getOptions(options).map((o) => ({ value: o, label: o }));
    return (
      <Select
        data={opts}
        value={(value as string) ?? null}
        onChange={(v) => onChange(v ?? "")}
        placeholder="Select an option…"
        error={error}
        allowDeselect={false}
      />
    );
  }

  if (fieldType === "RADIO") {
    const opts = getOptions(options);
    return (
      <Radio.Group
        value={(value as string) ?? ""}
        onChange={(v) => onChange(v)}
        error={error}
      >
        <Stack gap="xs">
          {opts.map((opt) => (
            <Radio
              key={opt}
              value={opt}
              label={opt}
              styles={{
                root: {
                  padding: "10px 14px",
                  border: "1px solid var(--mantine-color-gray-2)",
                  borderRadius: 4,
                  cursor: "pointer",
                },
              }}
            />
          ))}
        </Stack>
      </Radio.Group>
    );
  }

  if (fieldType === "MULTISELECT") {
    const opts    = getOptions(options);
    const checked = (value as string[]) ?? [];
    return (
      <Checkbox.Group
        value={checked}
        onChange={(v) => onChange(v)}
        error={error}
      >
        <Stack gap="xs">
          {opts.map((opt) => (
            <Checkbox
              key={opt}
              value={opt}
              label={opt}
              styles={{
                root: {
                  padding: "10px 14px",
                  border: "1px solid var(--mantine-color-gray-2)",
                  borderRadius: 4,
                  cursor: "pointer",
                },
              }}
            />
          ))}
        </Stack>
      </Checkbox.Group>
    );
  }

  if (fieldType === "BOOLEAN") {
    const checked = (value as boolean) ?? false;
    return (
      <Checkbox
        label="Yes"
        checked={checked}
        onChange={(e) => onChange(e.currentTarget.checked)}
        error={error}
        styles={{
          root: {
            padding: "10px 14px",
            border: "1px solid var(--mantine-color-gray-2)",
            borderRadius: 4,
          },
        }}
      />
    );
  }

  if (fieldType === "LIKERT") {
    const opts = getLikertOptions(options);
    const ans  = (value as LikertAnswer) ?? {};
    return (
      <Box style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", minWidth: 400, borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", paddingBottom: 10, paddingRight: 20, minWidth: 160, color: "var(--mantine-color-gray-5)", fontWeight: 500 }} />
              {opts.scale.map((label) => (
                <th key={label} style={{ textAlign: "center", paddingBottom: 10, paddingLeft: 8, paddingRight: 8, color: "var(--mantine-color-gray-5)", fontWeight: 500, fontSize: 11, whiteSpace: "nowrap" }}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {opts.rows.map((row, rowIdx) => {
              const rowKey = String(rowIdx);
              return (
                <tr key={rowIdx} style={{ borderTop: "1px solid var(--mantine-color-gray-1)" }}>
                  <td style={{ padding: "12px 20px 12px 0", color: "var(--mantine-color-gray-8)", lineHeight: 1.4 }}>{row}</td>
                  {opts.scale.map((scaleLabel) => {
                    const selected = ans[rowKey] === scaleLabel;
                    return (
                      <td key={scaleLabel} style={{ textAlign: "center", padding: "12px 8px" }}>
                        <Box
                          component="button"
                          type="button"
                          onClick={() => onChange({ ...ans, [rowKey]: scaleLabel })}
                          style={{
                            width: 20, height: 20,
                            borderRadius: "50%",
                            border: `2px solid ${selected ? "var(--mantine-color-blue-5)" : "var(--mantine-color-gray-3)"}`,
                            background: selected ? "var(--mantine-color-blue-5)" : "transparent",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            margin: "0 auto",
                            cursor: "pointer",
                            transition: "border-color 0.15s, background 0.15s",
                          }}
                        >
                          {selected && <Box style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff" }} />}
                        </Box>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
        {error && <Text size="xs" c="red.6" mt="xs">{error}</Text>}
      </Box>
    );
  }

  // Default: text
  return (
    <TextInput
      value={(value as string) ?? ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Your answer…"
      error={error}
    />
  );
}

// ── Main form ─────────────────────────────────────────────────────────────────

export function QuestionnaireForm({
  milestoneId,
  fields,
  draftAnswers = {},
}: {
  milestoneId: string;
  fields: Field[];
  draftAnswers?: Record<string, unknown>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isSaving,  startSaving]     = useTransition();
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [isReview, setIsReview] = useState(false);
  const [answers, setAnswers]   = useState<Answers>(draftAnswers as Answers);
  const [errors,  setErrors]    = useState<Record<string, string>>({});

  const pages      = parsePages(fields);
  const totalPages = pages.length;

  if (fields.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="No questions yet"
        description="No questions have been added. Check back soon."
      />
    );
  }

  function setAnswer(fieldId: string, value: AnswerValue) {
    setAnswers((prev) => ({ ...prev, [fieldId]: value }));
    setErrors((prev) => { const next = { ...prev }; delete next[fieldId]; return next; });
  }

  function validatePage(page: Page): boolean {
    const newErrors: Record<string, string> = {};
    for (const field of page.fields) {
      if (NON_ANSWERABLE.includes(field.fieldType) || !field.required) continue;
      const val   = answers[field.id];
      const empty = val === undefined || val === "" || (Array.isArray(val) && val.length === 0);
      if (empty) newErrors[field.id] = "This field is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleNext() {
    if (!validatePage(pages[currentPageIndex])) return;
    if (currentPageIndex < totalPages - 1) {
      setCurrentPageIndex((i) => i + 1);
    } else {
      setIsReview(true);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleBack() {
    if (isReview) { setIsReview(false); } else { setCurrentPageIndex((i) => i - 1); }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function jumpToPage(index: number) {
    setIsReview(false);
    setCurrentPageIndex(index);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleSubmit() {
    const formData = new FormData();
    for (const field of fields) {
      if (NON_ANSWERABLE.includes(field.fieldType)) continue;
      const val = answers[field.id];
      if (field.fieldType === "MULTISELECT" && Array.isArray(val)) {
        (val as string[]).forEach((v) => formData.append(field.id, v));
      } else if (field.fieldType === "BOOLEAN") {
        if (val) formData.append(field.id, "on");
      } else if (field.fieldType === "LIKERT") {
        formData.append(field.id, JSON.stringify(val ?? {}));
      } else {
        formData.append(field.id, (val as string) ?? "");
      }
    }
    startTransition(async () => { await submitQuestionnaire(milestoneId, formData); });
  }

  function handleSaveDraft() {
    startSaving(async () => {
      await saveQuestionnaireDraft(milestoneId, answers as Record<string, unknown>);
      router.push("/portal");
    });
  }

  const progressPct = isReview
    ? 100
    : Math.round(((currentPageIndex + 1) / (totalPages + 1)) * 100);

  // ── Review page ───────────────────────────────────────────────────────────────
  if (isReview) {
    const answerablePages = pages.map((page) => ({
      ...page,
      fields: page.fields.filter((f) => !NON_ANSWERABLE.includes(f.fieldType)),
    })).filter((p) => p.fields.length > 0);

    return (
      <Stack gap="md">
        <Box>
          <Group justify="space-between" mb={6}>
            <Text size="xs" fw={600} tt="uppercase" lts="0.1em" c="gray.5">Review your answers</Text>
            <Text size="xs" c="gray.4">Almost done</Text>
          </Group>
          <Progress value={100} size="xs" color="blue" />
        </Box>

        {answerablePages.map((page, pi) => (
          <Box
            key={pi}
            style={{
              border: "1px solid var(--mantine-color-gray-2)",
              borderRadius: 4,
              overflow: "hidden",
            }}
          >
            {page.sectionTitle && (
              <Group
                justify="space-between"
                px="md"
                py="sm"
                style={{
                  borderBottom: "1px solid var(--mantine-color-gray-1)",
                  background: "var(--mantine-color-gray-0)",
                }}
              >
                <Box>
                  <Text size="xs" fw={700} tt="uppercase" lts="0.15em" c="blue.5">Section {pi + 1}</Text>
                  <Text size="sm" fw={600} c="gray.9">{page.sectionTitle}</Text>
                </Box>
                <Button
                  variant="subtle"
                  color="gray"
                  size="xs"
                  leftSection={<Pencil size={11} />}
                  onClick={() => jumpToPage(pi)}
                >
                  Edit
                </Button>
              </Group>
            )}
            <Stack gap={0}>
              {page.fields.map((field, fi) => (
                <Group
                  key={field.id}
                  justify="space-between"
                  align="flex-start"
                  px="md"
                  py="sm"
                  style={{
                    borderTop: fi > 0 ? "1px solid var(--mantine-color-gray-1)" : undefined,
                  }}
                >
                  <Box style={{ flex: 1, minWidth: 0 }}>
                    <Text size="xs" c="gray.5" mb={2}>{field.label}</Text>
                    <Text size="sm" c="gray.8" style={{ whiteSpace: "pre-wrap" }}>
                      {formatAnswer(field, answers[field.id])}
                    </Text>
                  </Box>
                  {!page.sectionTitle && (
                    <Button
                      variant="subtle"
                      color="gray"
                      size="xs"
                      leftSection={<Pencil size={11} />}
                      onClick={() => jumpToPage(pi)}
                      style={{ flexShrink: 0 }}
                    >
                      Edit
                    </Button>
                  )}
                </Group>
              ))}
            </Stack>
          </Box>
        ))}

        <Group justify="space-between" pt="xs">
          <Button variant="subtle" color="gray" leftSection={<ArrowLeft size={14} />} onClick={handleBack}>
            Back
          </Button>
          <Group gap="xs">
            <Button variant="default" loading={isSaving} onClick={handleSaveDraft}>
              Save &amp; come back later
            </Button>
            <Button
              color="green"
              loading={isPending}
              leftSection={<CheckCircle size={14} />}
              onClick={handleSubmit}
            >
              Submit answers
            </Button>
          </Group>
        </Group>
      </Stack>
    );
  }

  // ── Question page ─────────────────────────────────────────────────────────────
  const page       = pages[currentPageIndex];
  const isLastPage = currentPageIndex === totalPages - 1;

  return (
    <Stack gap="md">
      {/* Progress */}
      <Box>
        <Group justify="space-between" mb={6}>
          <Text size="xs" fw={600} c="gray.5">
            {page.sectionTitle ?? `Step ${currentPageIndex + 1}`}
          </Text>
          <Text size="xs" c="gray.4">{currentPageIndex + 1} of {totalPages}</Text>
        </Group>
        <Progress value={progressPct} size="xs" color="blue" />
      </Box>

      {/* Section header */}
      {(page.sectionTitle || page.sectionDesc) && (
        <Box>
          {page.sectionTitle && (
            <Text fw={700} fz={18} c="gray.9">{page.sectionTitle}</Text>
          )}
          {page.sectionDesc && (
            <Text size="sm" c="gray.5" mt={4} style={{ lineHeight: 1.6 }}>{page.sectionDesc}</Text>
          )}
        </Box>
      )}

      {/* Fields */}
      {page.fields.map((field) => {
        if (field.fieldType === "CONTENT") {
          return (
            <Box key={field.id} py="xs">
              {field.label && <Text fw={600} c="gray.9">{field.label}</Text>}
              {field.helpText && (
                <Text size="sm" c="gray.5" mt={4} style={{ lineHeight: 1.6 }}>{field.helpText}</Text>
              )}
            </Box>
          );
        }

        return (
          <Box
            key={field.id}
            p="md"
            style={{
              border: "1px solid var(--mantine-color-gray-2)",
              borderRadius: 4,
              background: "white",
            }}
          >
            <Box mb="sm">
              <Text size="sm" fw={600} c="gray.9">
                {field.label}
                {field.required && <Text component="span" c="red.5" ml={3}>*</Text>}
              </Text>
              {field.helpText && (
                <Text size="xs" c="gray.5" mt={4} style={{ lineHeight: 1.5 }}>{field.helpText}</Text>
              )}
            </Box>
            <FieldInput
              field={field}
              value={answers[field.id]}
              onChange={(val) => setAnswer(field.id, val)}
              error={errors[field.id]}
            />
          </Box>
        );
      })}

      {/* Navigation */}
      <Group justify="space-between" pt="xs">
        <Button
          variant="subtle"
          color="gray"
          leftSection={<ArrowLeft size={14} />}
          disabled={currentPageIndex === 0}
          onClick={handleBack}
        >
          Back
        </Button>
        <Group gap="xs">
          <Button variant="default" loading={isSaving} onClick={handleSaveDraft}>
            Save &amp; come back later
          </Button>
          <Button rightSection={<ArrowRight size={14} />} onClick={handleNext}>
            {isLastPage ? "Review answers" : "Next"}
          </Button>
        </Group>
      </Group>
    </Stack>
  );
}
