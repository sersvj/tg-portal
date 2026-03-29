"use client";

import { Group, Text, Button, Box, Divider } from "@mantine/core";
import { Download, Printer } from "lucide-react";

type Field = {
  id: string;
  label: string;
  fieldType: string;
  order: number;
};

type Answer = {
  fieldId: string;
  value: unknown;
};

type Props = {
  milestoneName: string;
  clientName: string;
  submittedAt: string; // ISO string
  fields: Field[];
  answers: Answer[];
};

const NON_ANSWERABLE = ["PAGE_BREAK", "CONTENT"];

function esc(str: unknown): string {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatValue(value: unknown, fieldType: string): string {
  if (value === null || value === undefined || value === "") return "";
  if (fieldType === "BOOLEAN") return value ? "Yes" : "No";
  if (fieldType === "MULTISELECT") {
    const arr = Array.isArray(value) ? value : [];
    return arr.join(", ");
  }
  if (fieldType === "LIKERT") {
    const obj = value as Record<string, unknown>;
    return Object.entries(obj)
      .map(([q, r]) => `${q}: ${r}`)
      .join("  ·  ");
  }
  return String(value);
}

function formatValueHtml(value: unknown, fieldType: string): string {
  if (value === null || value === undefined || value === "") return "";
  if (fieldType === "BOOLEAN") return value ? "Yes" : "No";
  if (fieldType === "MULTISELECT") {
    const arr = Array.isArray(value) ? value : [];
    if (arr.length === 0) return "";
    return `<ul class="multi-list">${arr.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>`;
  }
  if (fieldType === "LIKERT") {
    const obj = value as Record<string, unknown>;
    const entries = Object.entries(obj);
    if (entries.length === 0) return "";
    return `<table class="likert-table">${entries
      .map(([q, r]) => `<tr><td class="likert-q">${esc(q)}</td><td class="likert-r">${esc(r)}</td></tr>`)
      .join("")}</table>`;
  }
  return esc(String(value)).replace(/\n/g, "<br>");
}

function buildReportHtml(
  clientName: string,
  milestoneName: string,
  date: string,
  fields: Field[],
  answerMap: Map<string, Answer>
): string {
  const rows = fields
    .map((field) => {
      if (field.fieldType === "PAGE_BREAK") {
        return `<div class="section-break"><span>${esc(field.label || "Section")}</span></div>`;
      }
      if (field.fieldType === "CONTENT") {
        return `<p class="content-note">${esc(field.label)}</p>`;
      }
      const answer = answerMap.get(field.id);
      const html = answer ? formatValueHtml(answer.value, field.fieldType) : "";
      const isEmpty = !html;
      return `
        <div class="qa-row">
          <div class="qa-question">${esc(field.label)}</div>
          <div class="qa-answer${isEmpty ? " empty" : ""}">${isEmpty ? "No response" : html}</div>
        </div>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${esc(clientName)} — ${esc(milestoneName)}</title>
  <style>
    @page { size: letter; margin: 0.9in 1in 0.75in; }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif; font-size: 10pt; color: #1a1a1a; line-height: 1.55; }
    .report-header { padding-bottom: 14pt; border-bottom: 1.5pt solid #1a1a1a; margin-bottom: 28pt; }
    .report-header .eyebrow { font-size: 7pt; font-weight: 800; text-transform: uppercase; letter-spacing: 0.18em; color: #64748b; margin-bottom: 5pt; }
    .report-header h1 { font-size: 22pt; font-weight: 900; letter-spacing: -0.025em; line-height: 1.1; color: #1a1a1a; }
    .report-header .meta { margin-top: 7pt; font-size: 8.5pt; color: #64748b; }
    .section-break { margin-top: 22pt; margin-bottom: 10pt; padding-bottom: 5pt; border-bottom: 0.5pt solid #cbd5e1; page-break-after: avoid; }
    .section-break span { font-size: 7pt; font-weight: 800; text-transform: uppercase; letter-spacing: 0.18em; color: #64748b; }
    .content-note { font-size: 9pt; color: #64748b; font-style: italic; margin-bottom: 10pt; }
    .qa-row { display: grid; grid-template-columns: 2.6in 1fr; gap: 18pt; padding: 9pt 0; border-bottom: 0.5pt solid #f1f5f9; page-break-inside: avoid; }
    .qa-question { font-size: 8.5pt; font-weight: 600; color: #334155; line-height: 1.45; padding-top: 1pt; }
    .qa-answer { font-size: 10pt; color: #1a1a1a; line-height: 1.55; }
    .qa-answer.empty { color: #94a3b8; font-style: italic; font-size: 9pt; }
    .multi-list { list-style: none; padding: 0; }
    .multi-list li::before { content: "· "; color: #64748b; }
    .likert-table { width: 100%; border-collapse: collapse; font-size: 9pt; }
    .likert-table tr + tr td { padding-top: 3pt; }
    .likert-q { color: #334155; padding-right: 12pt; width: 80%; }
    .likert-r { font-weight: 700; text-align: right; white-space: nowrap; color: #1a1a1a; }
    .report-footer { margin-top: 36pt; padding-top: 10pt; border-top: 0.5pt solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; font-size: 7.5pt; color: #94a3b8; }
    .report-footer strong { font-weight: 700; color: #64748b; }
    @media screen { html { background: #e5e7eb; } body { max-width: 8.5in; margin: 32px auto; padding: 0.9in 1in 0.75in; background: white; box-shadow: 0 2px 12px rgba(0,0,0,0.12); min-height: 11in; } }
  </style>
</head>
<body>
  <div class="report-header">
    <p class="eyebrow">${esc(clientName)}</p>
    <h1>${esc(milestoneName)}</h1>
    <p class="meta">Submitted ${esc(date)}</p>
  </div>
  ${rows}
  <div class="report-footer">
    <strong>Tayloe/Gray</strong>
    <span>Generated ${esc(date)}</span>
  </div>
  <script>window.addEventListener("load", function () { window.print(); });</script>
</body>
</html>`;
}

export function ResponseViewer({ milestoneName, clientName, submittedAt, fields, answers }: Props) {
  const answerMap = new Map(answers.map((a) => [a.fieldId, a]));
  const answerableFields = fields.filter((f) => !NON_ANSWERABLE.includes(f.fieldType));

  const date = new Date(submittedAt).toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  function handleCSV() {
    const rows: string[][] = [["Question", "Answer"]];
    for (const field of answerableFields) {
      const answer = answerMap.get(field.id);
      const display = answer ? formatValue(answer.value, field.fieldType) : "";
      rows.push([field.label, display]);
    }
    const csv = rows
      .map((r) => r.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${clientName} - ${milestoneName}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handlePrint() {
    const html = buildReportHtml(clientName, milestoneName, date, fields, answerMap);
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.open();
    win.document.write(html);
    win.document.close();
  }

  return (
    <Box>
      {/* Toolbar */}
      <Group justify="space-between" mb="md">
        <Text size="xs" c="gray.5">Submitted {date}</Text>
        <Group gap="xs">
          <Button
            variant="default"
            size="xs"
            leftSection={<Download size={12} />}
            onClick={handleCSV}
          >
            Export CSV
          </Button>
          <Button
            variant="default"
            size="xs"
            leftSection={<Printer size={12} />}
            onClick={handlePrint}
          >
            Print / PDF
          </Button>
        </Group>
      </Group>

      {/* Screen view */}
      <Box>
        {fields.map((field, i) => {
          if (field.fieldType === "PAGE_BREAK") {
            return (
              <Box key={field.id} pt="md" pb="xs">
                <Text size="xs" fw={700} tt="uppercase" lts="0.12em" c="gray.5">
                  {field.label || "Section"}
                </Text>
                <Divider mt={4} />
              </Box>
            );
          }
          if (field.fieldType === "CONTENT") {
            return (
              <Box key={field.id} py="sm">
                <Text size="xs" c="gray.5" fs="italic">{field.label}</Text>
              </Box>
            );
          }

          const answer  = answerMap.get(field.id);
          const display = answer ? formatValue(answer.value, field.fieldType) : "";
          const isEmpty = !display;

          return (
            <Box
              key={field.id}
              py="sm"
              style={{
                borderBottom: i < fields.length - 1 ? "1px solid var(--mantine-color-gray-1)" : undefined,
                display: "grid",
                gridTemplateColumns: "220px 1fr",
                gap: 24,
                alignItems: "flex-start",
              }}
            >
              <Text size="xs" fw={600} c="gray.7" style={{ lineHeight: 1.55 }}>{field.label}</Text>
              <Text
                size="sm"
                c={isEmpty ? "gray.4" : "gray.9"}
                fs={isEmpty ? "italic" : undefined}
                style={{ whiteSpace: "pre-wrap", lineHeight: 1.55 }}
              >
                {isEmpty ? "No response" : display}
              </Text>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
