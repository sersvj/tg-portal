"use client";

import { useState } from "react";
import { Box, Group, Text, Stack, Badge, ScrollArea } from "@mantine/core";
import { FileText, Tag } from "lucide-react";
import { PageNodeType } from "@prisma/client";
import { ExportMenu } from "./export-menu";
import {
  esc, stripHtml, csvString, triggerDownload, openPrintWindow,
  wrapPrintDoc, printHeader, printFooter, safeFilename,
} from "@/lib/export-utils";

type PageFieldAnswer = {
  id: string;
  fieldTemplateId: string;
  value: string;
  fieldTemplate: { label: string; order: number };
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
  children: PageNode[];
  answers: PageFieldAnswer[];
};

type Props = {
  nodes: PageNode[];
  clientName?: string;
  milestoneName?: string;
};

type FlatPage = { page: PageNode; section: string | null };

function flattenPages(nodes: PageNode[]): FlatPage[] {
  const result: FlatPage[] = [];
  let section: string | null = null;
  for (const node of [...nodes].sort((a, b) => a.order - b.order)) {
    if (node.type === "LABEL") {
      section = node.title;
      for (const child of [...node.children].sort((a, b) => a.order - b.order)) {
        if (child.type === "PAGE") result.push({ page: child, section });
      }
    } else {
      result.push({ page: node, section: null });
      for (const child of [...node.children].sort((a, b) => a.order - b.order)) {
        if (child.type === "PAGE") result.push({ page: child, section: node.title });
      }
    }
  }
  return result;
}

export function PageContentViewer({ nodes, clientName = "Client", milestoneName = "Page Content" }: Props) {
  const pages = nodes.flatMap((n) => [n, ...n.children]).filter((n) => n.type === "PAGE");
  const [selectedId, setSelectedId] = useState(pages[0]?.id ?? null);
  const selected = pages.find((p) => p.id === selectedId) ?? null;
  const rootNodes = [...nodes].sort((a, b) => a.order - b.order);
  const filename = safeFilename(`${clientName} ${milestoneName}`);
  const date = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  // ── CSV ────────────────────────────────────────────────────────────────────
  function handleCSV() {
    const rows: string[][] = [["Section", "Page", "Type", "Value"]];
    for (const { page, section } of flattenPages(nodes)) {
      const sect = section ?? "";
      if (page.isNA) {
        rows.push([sect, page.title, "Status", "N/A"]);
        continue;
      }
      rows.push([sect, page.title, "Content", page.content ? stripHtml(page.content) : ""]);
      const sorted = [...page.answers].sort((a, b) => a.fieldTemplate.order - b.fieldTemplate.order);
      for (const ans of sorted) {
        const val = /<[a-z][\s\S]*>/i.test(ans.value) ? stripHtml(ans.value) : ans.value;
        rows.push([sect, page.title, ans.fieldTemplate.label, val]);
      }
    }
    triggerDownload(new Blob([csvString(rows)], { type: "text/csv" }), `${filename}.csv`);
  }

  // ── PDF (print-to-window) ─────────────────────────────────────────────────
  function handlePDF() {
    const EXTRA = `
      .page-section { margin-top: 24pt; padding-bottom: 6pt; border-bottom: 1pt solid #1a1a1a; margin-bottom: 14pt; page-break-after: avoid; }
      .page-section span { font-size: 7pt; font-weight: 800; text-transform: uppercase; letter-spacing: 0.18em; color: #64748b; }
      .page-entry { margin-bottom: 20pt; page-break-inside: avoid; }
      .page-title { font-size: 13pt; font-weight: 700; margin-bottom: 6pt; }
      .page-na { font-style: italic; color: #94a3b8; font-size: 9pt; }
      .page-content { font-size: 9.5pt; color: #334155; line-height: 1.65; border-left: 2pt solid #e2e8f0; padding-left: 10pt; }
      .page-content p { margin-bottom: 5pt; }
      .field-label { font-size: 7pt; font-weight: 800; text-transform: uppercase; letter-spacing: 0.14em; color: #94a3b8; margin-top: 10pt; margin-bottom: 3pt; }
      .field-value { font-size: 9.5pt; color: #334155; line-height: 1.6; }
    `;
    let body = printHeader(clientName, milestoneName, date);
    let lastSection: string | null = undefined as unknown as null;

    for (const { page, section } of flattenPages(nodes)) {
      if (section !== lastSection) {
        if (section) body += `<div class="page-section"><span>${esc(section)}</span></div>`;
        lastSection = section;
      }
      body += `<div class="page-entry">`;
      body += `<div class="page-title">${esc(page.title)}</div>`;
      if (page.isNA) {
        body += `<p class="page-na">Marked as not applicable.</p>`;
      } else {
        if (page.content) body += `<div class="page-content">${page.content}</div>`;
        const sorted = [...page.answers].sort((a, b) => a.fieldTemplate.order - b.fieldTemplate.order);
        for (const ans of sorted) {
          body += `<div class="field-label">${esc(ans.fieldTemplate.label)}</div>`;
          const isHtml = /<[a-z][\s\S]*>/i.test(ans.value);
          body += `<div class="field-value">${isHtml ? ans.value : esc(ans.value).replace(/\n/g, "<br>")}</div>`;
        }
      }
      body += `</div>`;
    }
    body += printFooter(date);

    openPrintWindow(wrapPrintDoc(`${clientName} — ${milestoneName}`, EXTRA, body));
  }

  // ── Markdown ──────────────────────────────────────────────────────────────
  async function handleMarkdown() {
    const { exportMarkdown } = await import("@/lib/page-content-export");
    await exportMarkdown(nodes as Parameters<typeof exportMarkdown>[0], filename);
  }

  // ── Word (.docx) ──────────────────────────────────────────────────────────
  async function handleWord() {
    const { exportDocx } = await import("@/lib/page-content-export");
    await exportDocx(nodes as Parameters<typeof exportDocx>[0], filename, clientName);
  }

  return (
    <Stack gap={0}>
      {/* Export toolbar */}
      <Box
        px="md"
        py="xs"
        style={{
          borderBottom: "1px solid var(--mantine-color-gray-2)",
          background: "var(--mantine-color-gray-0)",
          display: "flex",
          justifyContent: "flex-end",
        }}
      >
        <ExportMenu handlers={[
          { format: "csv",  handler: handleCSV },
          { format: "pdf",  handler: handlePDF },
          { format: "md",   handler: handleMarkdown },
          { format: "docx", handler: handleWord },
        ]} />
      </Box>

      <Group gap={0} align="flex-start" wrap="nowrap" style={{ minHeight: 360 }}>
        {/* Left tree nav */}
        <Box style={{ width: 240, flexShrink: 0, borderRight: "1px solid var(--mantine-color-gray-2)" }}>
          <ScrollArea>
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
                    <NavRow node={node} selectedId={selectedId} onSelect={setSelectedId} />
                  )}
                  {node.children.length > 0 && (
                    [...node.children].sort((a, b) => a.order - b.order).map((child) => (
                      <Box key={child.id} pl="md">
                        <NavRow node={child} selectedId={selectedId} onSelect={setSelectedId} />
                      </Box>
                    ))
                  )}
                </Box>
              ))}
            </Stack>
          </ScrollArea>
        </Box>

        {/* Right content panel */}
        <Box p="lg" style={{ flex: 1, minWidth: 0 }}>
          {selected ? (
            <Stack gap="md">
              <Box>
                <Group gap="xs" mb={4}>
                  <Text fw={700} fz={16} c="gray.9">{selected.title}</Text>
                  {selected.isOptional && <Badge color="gray" variant="light" size="xs">Optional</Badge>}
                  {selected.isNA && <Badge color="orange" variant="light" size="xs">N/A</Badge>}
                </Group>
              </Box>

              {selected.isNA ? (
                <Box p="sm" style={{ background: "var(--mantine-color-gray-0)", border: "1px solid var(--mantine-color-gray-2)", borderRadius: 4 }}>
                  <Text size="sm" c="gray.5" fs="italic">Marked as not applicable by the client.</Text>
                </Box>
              ) : selected.content ? (
                <Box>
                  <Text size="xs" fw={700} tt="uppercase" lts="0.08em" c="gray.5" mb={6}>Content</Text>
                  <Box
                    style={{ fontSize: 14, color: "var(--mantine-color-gray-7)", lineHeight: 1.7, borderLeft: "2px solid var(--mantine-color-gray-2)", paddingLeft: 12 }}
                    dangerouslySetInnerHTML={{ __html: selected.content }}
                  />
                </Box>
              ) : (
                <Text size="sm" c="gray.4" fs="italic">No content provided.</Text>
              )}

              {selected.answers.length > 0 && (
                <Stack gap="sm">
                  {[...selected.answers]
                    .sort((a, b) => a.fieldTemplate.order - b.fieldTemplate.order)
                    .map((ans) => (
                      <Box key={ans.id}>
                        <Text size="xs" fw={700} tt="uppercase" lts="0.08em" c="gray.5" mb={2}>
                          {ans.fieldTemplate.label}
                        </Text>
                        {/<[a-z][\s\S]*>/i.test(ans.value) ? (
                          <Box style={{ fontSize: 14, color: "var(--mantine-color-gray-7)", lineHeight: 1.7 }} dangerouslySetInnerHTML={{ __html: ans.value }} />
                        ) : (
                          <Text size="sm" c="gray.8">{ans.value}</Text>
                        )}
                      </Box>
                    ))}
                </Stack>
              )}
            </Stack>
          ) : (
            <Text size="sm" c="gray.4">Select a page to view its content.</Text>
          )}
        </Box>
      </Group>
    </Stack>
  );
}

function NavRow({ node, selectedId, onSelect }: { node: PageNode; selectedId: string | null; onSelect: (id: string) => void }) {
  const isSelected = node.id === selectedId;
  const hasContent = !!node.content || node.isNA;
  return (
    <Box px="md" py="sm" onClick={() => onSelect(node.id)}
      style={{ cursor: "pointer", borderLeft: `3px solid ${isSelected ? "var(--mantine-color-blue-5)" : "transparent"}`, background: isSelected ? "var(--mantine-color-blue-0)" : undefined, transition: "background 120ms" }}
    >
      <Group gap="xs" wrap="nowrap">
        <Box style={{ width: 7, height: 7, borderRadius: "50%", flexShrink: 0, background: node.isNA ? "var(--mantine-color-orange-4)" : hasContent ? "var(--mantine-color-green-5)" : "var(--mantine-color-gray-3)" }} />
        <Text size="sm" fw={isSelected ? 600 : 400} c={isSelected ? "blue.7" : "gray.8"} truncate>{node.title}</Text>
        {node.isOptional && <Badge color="gray" variant="light" size="xs" style={{ flexShrink: 0 }}>Opt</Badge>}
      </Group>
    </Box>
  );
}
