"use client";

import { useState } from "react";
import { Menu, Button } from "@mantine/core";
import { Download, FileText, FileDown, Table2, Printer } from "lucide-react";

export type ExportFormat = "csv" | "pdf" | "md" | "docx";

export type ExportHandler = {
  format: ExportFormat;
  handler: () => void | Promise<void>;
};

const FORMAT_LABELS: Record<ExportFormat, string> = {
  csv:  "CSV (.csv)",
  pdf:  "PDF / Print",
  md:   "Markdown (.md)",
  docx: "Word (.docx)",
};

const FORMAT_ICONS: Record<ExportFormat, React.ComponentType<{ size: number }>> = {
  csv:  Table2,
  pdf:  Printer,
  md:   FileDown,
  docx: FileText,
};

// Canonical display order
const FORMAT_ORDER: ExportFormat[] = ["csv", "pdf", "md", "docx"];

export function ExportMenu({ handlers }: { handlers: ExportHandler[] }) {
  const [loading, setLoading] = useState(false);

  const ordered = FORMAT_ORDER
    .map((fmt) => handlers.find((h) => h.format === fmt))
    .filter(Boolean) as ExportHandler[];

  async function run(h: ExportHandler) {
    setLoading(true);
    try { await h.handler(); } finally { setLoading(false); }
  }

  return (
    <Menu shadow="sm" width={180} position="bottom-end">
      <Menu.Target>
        <Button
          size="xs"
          variant="default"
          leftSection={<Download size={12} />}
          loading={loading}
          style={{ cursor: "pointer" }}
        >
          Export
        </Button>
      </Menu.Target>
      <Menu.Dropdown>
        {ordered.map((h) => {
          const Icon = FORMAT_ICONS[h.format];
          return (
            <Menu.Item key={h.format} leftSection={<Icon size={13} />} onClick={() => run(h)}>
              {FORMAT_LABELS[h.format]}
            </Menu.Item>
          );
        })}
      </Menu.Dropdown>
    </Menu>
  );
}
