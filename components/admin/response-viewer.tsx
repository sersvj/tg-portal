"use client";

import { Group, Text, Box, Divider } from "@mantine/core";
import { ExportMenu } from "./export-menu";
import {
  esc, csvString, triggerDownload, openPrintWindow, downloadMarkdown,
  wrapPrintDoc, printHeader, printFooter, safeFilename,
} from "@/lib/export-utils";

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
  submittedAt: string;
  fields: Field[];
  answers: Answer[];
};

const NON_ANSWERABLE = ["PAGE_BREAK", "CONTENT"];

function formatValue(value: unknown, fieldType: string): string {
  if (value === null || value === undefined || value === "") return "";
  if (fieldType === "BOOLEAN") return value ? "Yes" : "No";
  if (fieldType === "MULTISELECT") {
    const arr = Array.isArray(value) ? value : [];
    return arr.join(", ");
  }
  if (fieldType === "LIKERT") {
    const obj = value as Record<string, unknown>;
    return Object.entries(obj).map(([q, r]) => `${q}: ${r}`).join("  ·  ");
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

export function ResponseViewer({ milestoneName, clientName, submittedAt, fields, answers }: Props) {
  const answerMap = new Map(answers.map((a) => [a.fieldId, a]));
  const answerableFields = fields.filter((f) => !NON_ANSWERABLE.includes(f.fieldType));
  const filename = safeFilename(`${clientName} ${milestoneName}`);

  const date = new Date(submittedAt).toLocaleString("en-US", {
    year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
  });

  // ── CSV ────────────────────────────────────────────────────────────────────
  function handleCSV() {
    const rows: string[][] = [["Question", "Answer"]];
    for (const field of answerableFields) {
      const answer = answerMap.get(field.id);
      rows.push([field.label, answer ? formatValue(answer.value, field.fieldType) : ""]);
    }
    triggerDownload(new Blob([csvString(rows)], { type: "text/csv" }), `${filename}.csv`);
  }

  // ── PDF (print-to-window) ─────────────────────────────────────────────────
  function handlePDF() {
    const EXTRA = `
      .qa-block { margin-bottom: 18pt; page-break-inside: avoid; }
      .qa-question { font-size: 8pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b; margin-bottom: 4pt; }
      .qa-answer { font-size: 10.5pt; color: #1a1a1a; line-height: 1.6; }
      .qa-answer.empty { color: #94a3b8; font-style: italic; }
      .section-divider { margin-top: 30pt; margin-bottom: 14pt; padding-bottom: 8pt; border-bottom: 1.5pt solid #1a1a1a; page-break-after: avoid; }
      .section-divider span { font-size: 15pt; font-weight: 800; letter-spacing: -0.01em; color: #1a1a1a; text-transform: none; }
      .content-note { font-size: 15pt; font-weight: 800; letter-spacing: -0.01em; color: #1a1a1a; font-style: normal; margin-top: 30pt; margin-bottom: 14pt; padding-bottom: 8pt; border-bottom: 1.5pt solid #1a1a1a; page-break-after: avoid; }
      .multi-list { list-style: disc; padding-left: 14pt; margin: 0; }
      .multi-list li { margin-bottom: 2pt; }
      .likert-table { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
      .likert-table tr + tr td { padding-top: 4pt; }
      .likert-q { color: #334155; padding-right: 12pt; }
      .likert-r { font-weight: 700; text-align: right; white-space: nowrap; color: #1a1a1a; }
    `;
    const rows = fields.map((field) => {
      if (field.fieldType === "PAGE_BREAK") {
        return `<div class="section-divider"><span>${esc(field.label || "Section")}</span></div>`;
      }
      if (field.fieldType === "CONTENT") {
        return `<p class="content-note">${esc(field.label)}</p>`;
      }
      const answer = answerMap.get(field.id);
      const html = answer ? formatValueHtml(answer.value, field.fieldType) : "";
      return `<div class="qa-block">
        <div class="qa-question">${esc(field.label)}</div>
        <div class="qa-answer${!html ? " empty" : ""}">${html || "No response"}</div>
      </div>`;
    }).join("\n");

    openPrintWindow(wrapPrintDoc(
      `${clientName} — ${milestoneName}`,
      EXTRA,
      printHeader(clientName, milestoneName, date) + rows + printFooter(date),
    ));
  }

  // ── Markdown ──────────────────────────────────────────────────────────────
  function handleMarkdown() {
    let md = `# ${clientName} — ${milestoneName}\n_Submitted: ${date}_\n\n`;
    for (const field of fields) {
      if (field.fieldType === "PAGE_BREAK") {
        md += `\n---\n\n## ${field.label || "Section"}\n\n`;
        continue;
      }
      if (field.fieldType === "CONTENT") {
        md += `_${field.label}_\n\n`;
        continue;
      }
      const answer = answerMap.get(field.id);
      const value = answer ? formatValue(answer.value, field.fieldType) : "";
      md += `**${field.label}**\n${value || "_No response_"}\n\n`;
    }
    downloadMarkdown(md.trim(), filename);
  }

  // ── Word (.docx) ──────────────────────────────────────────────────────────
  async function handleWord() {
    const { Paragraph, TextRun, HeadingLevel } = await import("docx");
    const children: InstanceType<typeof Paragraph>[] = [
      new Paragraph({ text: `${clientName} — ${milestoneName}`, heading: HeadingLevel.TITLE }),
      new Paragraph({ children: [new TextRun({ text: `Submitted: ${date}`, italics: true, color: "555555" })] }),
      new Paragraph({}),
    ];

    for (const field of fields) {
      if (field.fieldType === "PAGE_BREAK") {
        children.push(new Paragraph({ text: field.label || "Section", heading: HeadingLevel.HEADING_1 }));
        continue;
      }
      if (field.fieldType === "CONTENT") {
        children.push(new Paragraph({ children: [new TextRun({ text: field.label, italics: true, color: "888888" })] }));
        continue;
      }
      const answer = answerMap.get(field.id);
      const value = answer ? formatValue(answer.value, field.fieldType) : "";
      children.push(new Paragraph({ children: [new TextRun({ text: field.label, bold: true })] }));
      if (field.fieldType === "MULTISELECT" && Array.isArray(answer?.value)) {
        for (const item of answer.value as string[]) {
          children.push(new Paragraph({ text: `• ${item}` }));
        }
      } else {
        children.push(new Paragraph({ text: value || "No response" }));
      }
      children.push(new Paragraph({}));
    }

    const { downloadDocx } = await import("@/lib/export-utils");
    await downloadDocx(children, filename);
  }

  return (
    <Box>
      <Group justify="space-between" mb="md" align="center">
        <Text size="xs" c="gray.5">Submitted {date}</Text>
        <ExportMenu handlers={[
          { format: "csv",  handler: handleCSV },
          { format: "pdf",  handler: handlePDF },
          { format: "md",   handler: handleMarkdown },
          { format: "docx", handler: handleWord },
        ]} />
      </Group>

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
