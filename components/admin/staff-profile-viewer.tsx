"use client";

import { useState } from "react";
import { Box, Group, Text, Stack, Badge, ScrollArea } from "@mantine/core";
import { User, ImageIcon } from "lucide-react";
import { ExportMenu } from "./export-menu";
import {
  esc, stripHtml, csvString, triggerDownload, openPrintWindow,
  downloadMarkdown, wrapPrintDoc, printHeader, printFooter, safeFilename,
} from "@/lib/export-utils";

type StaffProfile = {
  id: string;
  name: string;
  title: string | null;
  bio: string | null;
  headshotFilename: string | null;
  noHeadshot: boolean;
  order: number;
};

type Props = {
  profiles: StaffProfile[];
  clientName: string;
  milestoneName: string;
};

export function StaffProfileViewer({ profiles, clientName, milestoneName }: Props) {
  const [selectedId, setSelectedId] = useState(profiles[0]?.id ?? null);
  const selected = profiles.find((p) => p.id === selectedId) ?? null;
  const filename = safeFilename(`${clientName} ${milestoneName}`);
  const date = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const sorted = [...profiles].sort((a, b) => a.order - b.order);

  // ── CSV ────────────────────────────────────────────────────────────────────
  function handleCSV() {
    const rows: string[][] = [["Name", "Title", "Bio", "Headshot"]];
    for (const p of sorted) {
      rows.push([
        p.name,
        p.title ?? "",
        p.bio ? stripHtml(p.bio) : "",
        p.noHeadshot ? "No headshot" : (p.headshotFilename ?? "Not uploaded"),
      ]);
    }
    triggerDownload(new Blob([csvString(rows)], { type: "text/csv" }), `${filename}.csv`);
  }

  // ── PDF (print-to-window) ─────────────────────────────────────────────────
  function handlePDF() {
    const EXTRA = `
      .profile { padding: 16pt 0; border-bottom: 0.5pt solid #e2e8f0; page-break-inside: avoid; }
      .profile:last-child { border-bottom: none; }
      .profile-name { font-size: 15pt; font-weight: 700; letter-spacing: -0.01em; margin-bottom: 2pt; }
      .profile-title { font-size: 9pt; color: #64748b; margin-bottom: 10pt; }
      .profile-label { font-size: 7pt; font-weight: 800; text-transform: uppercase; letter-spacing: 0.14em; color: #94a3b8; margin-bottom: 4pt; }
      .profile-bio { font-size: 9.5pt; color: #334155; line-height: 1.6; }
      .profile-bio p { margin-bottom: 6pt; }
      .profile-headshot { margin-top: 8pt; font-size: 8.5pt; color: #64748b; }
      .na { color: #94a3b8; font-style: italic; }
    `;
    const profilesHtml = sorted.map((p) => `
      <div class="profile">
        <div class="profile-name">${esc(p.name)}</div>
        ${p.title ? `<div class="profile-title">${esc(p.title)}</div>` : ""}
        ${p.bio ? `
          <div class="profile-label">Bio</div>
          <div class="profile-bio">${p.bio}</div>
        ` : `<div class="profile-bio na">No bio provided.</div>`}
        <div class="profile-headshot">
          <strong>Headshot:</strong>
          ${p.noHeadshot ? "No headshot" : (p.headshotFilename ? esc(p.headshotFilename) : "Not uploaded")}
        </div>
      </div>
    `).join("\n");

    openPrintWindow(wrapPrintDoc(
      `${clientName} — ${milestoneName}`,
      EXTRA,
      printHeader(clientName, milestoneName, date) + profilesHtml + printFooter(date),
    ));
  }

  // ── Markdown ──────────────────────────────────────────────────────────────
  async function handleMarkdown() {
    const TurndownService = (await import("turndown")).default;
    const td = new TurndownService({ headingStyle: "atx", bulletListMarker: "-" });

    let md = `# ${clientName} — ${milestoneName}\n\n`;
    for (const p of sorted) {
      md += `## ${p.name}\n`;
      if (p.title) md += `_${p.title}_\n`;
      md += "\n";
      if (p.bio) {
        md += td.turndown(p.bio) + "\n\n";
      } else {
        md += "_No bio provided._\n\n";
      }
      const headshot = p.noHeadshot ? "No headshot" : (p.headshotFilename ?? "Not uploaded");
      md += `**Headshot:** ${headshot}\n\n---\n\n`;
    }
    downloadMarkdown(md.trim(), filename);
  }

  // ── Word (.docx) ──────────────────────────────────────────────────────────
  async function handleWord() {
    const { Paragraph, TextRun, HeadingLevel } = await import("docx");

    const children: InstanceType<typeof Paragraph>[] = [
      new Paragraph({ text: `${clientName} — ${milestoneName}`, heading: HeadingLevel.TITLE }),
      new Paragraph({}),
    ];

    for (const p of sorted) {
      children.push(new Paragraph({ text: p.name, heading: HeadingLevel.HEADING_2 }));
      if (p.title) {
        children.push(new Paragraph({
          children: [new TextRun({ text: p.title, italics: true, color: "555555" })],
        }));
      }
      children.push(new Paragraph({}));

      if (p.bio) {
        const bioText = stripHtml(p.bio);
        for (const line of bioText.split(/\n+/).filter(Boolean)) {
          children.push(new Paragraph({ text: line }));
        }
      } else {
        children.push(new Paragraph({
          children: [new TextRun({ text: "No bio provided.", italics: true, color: "888888" })],
        }));
      }

      children.push(new Paragraph({
        children: [
          new TextRun({ text: "Headshot: ", bold: true }),
          new TextRun({ text: p.noHeadshot ? "No headshot" : (p.headshotFilename ?? "Not uploaded") }),
        ],
      }));
      children.push(new Paragraph({}));
    }

    const { downloadDocx } = await import("@/lib/export-utils");
    await downloadDocx(children, filename);
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

      <Group gap={0} align="flex-start" wrap="nowrap" style={{ minHeight: 300 }}>
        {/* Member list */}
        <Box style={{ width: 220, flexShrink: 0, borderRight: "1px solid var(--mantine-color-gray-2)" }}>
          <ScrollArea>
            <Stack gap={0}>
              {sorted.map((p) => {
                const isSelected = p.id === selectedId;
                return (
                  <Box
                    key={p.id}
                    px="md"
                    py="sm"
                    onClick={() => setSelectedId(p.id)}
                    style={{
                      cursor: "pointer",
                      borderLeft: `3px solid ${isSelected ? "var(--mantine-color-blue-5)" : "transparent"}`,
                      background: isSelected ? "var(--mantine-color-blue-0)" : undefined,
                      transition: "background 120ms",
                    }}
                  >
                    <Text size="sm" fw={isSelected ? 600 : 400} c={isSelected ? "blue.7" : "gray.8"} truncate>
                      {p.name}
                    </Text>
                    {p.title && <Text size="xs" c="gray.5" truncate>{p.title}</Text>}
                  </Box>
                );
              })}
            </Stack>
          </ScrollArea>
        </Box>

        {/* Detail panel */}
        <Box p="lg" style={{ flex: 1, minWidth: 0 }}>
          {selected ? (
            <Stack gap="md">
              <Box>
                <Group gap="xs" align="baseline" wrap="nowrap">
                  <User size={14} style={{ color: "var(--mantine-color-gray-4)", flexShrink: 0 }} />
                  <Text fw={700} fz={18} c="gray.9" style={{ letterSpacing: "-0.01em" }}>{selected.name}</Text>
                </Group>
                {selected.title && <Text size="sm" c="gray.5" mt={2} ml={22}>{selected.title}</Text>}
              </Box>

              {selected.bio ? (
                <Box>
                  <Text size="xs" fw={700} tt="uppercase" lts="0.08em" c="gray.5" mb={6}>Bio</Text>
                  <Box
                    style={{
                      fontSize: 14,
                      color: "var(--mantine-color-gray-7)",
                      lineHeight: 1.65,
                      borderLeft: "2px solid var(--mantine-color-gray-2)",
                      paddingLeft: 12,
                    }}
                    dangerouslySetInnerHTML={{ __html: selected.bio }}
                  />
                </Box>
              ) : (
                <Text size="sm" c="gray.4" fs="italic">No bio provided.</Text>
              )}

              <Box>
                <Text size="xs" fw={700} tt="uppercase" lts="0.08em" c="gray.5" mb={6}>Headshot</Text>
                {selected.noHeadshot ? (
                  <Badge color="gray" variant="light" size="sm">No headshot</Badge>
                ) : selected.headshotFilename ? (
                  <Badge color="teal" variant="light" size="sm" leftSection={<ImageIcon size={11} />}>
                    {selected.headshotFilename}
                  </Badge>
                ) : (
                  <Badge color="yellow" variant="light" size="sm">Not uploaded</Badge>
                )}
              </Box>
            </Stack>
          ) : (
            <Text size="sm" c="gray.4">Select a team member to view their profile.</Text>
          )}
        </Box>
      </Group>
    </Stack>
  );
}
