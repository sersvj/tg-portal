// Client-only export helpers — imported from "use client" components only.

export function esc(str: unknown): string {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function stripHtml(html: string): string {
  if (typeof document === "undefined") return html;
  const div = document.createElement("div");
  div.innerHTML = html;
  return (div.textContent ?? div.innerText ?? "").trim();
}

export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function csvString(rows: string[][]): string {
  return rows
    .map((r) => r.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
}

export function openPrintWindow(html: string): void {
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.open();
  win.document.write(html);
  win.document.close();
}

export const BASE_PRINT_STYLES = `
  @page { size: letter; margin: 0.9in 1in 0.75in; }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif; font-size: 10pt; color: #1a1a1a; line-height: 1.55; }
  .report-header { padding-bottom: 14pt; border-bottom: 1.5pt solid #1a1a1a; margin-bottom: 28pt; }
  .report-header .eyebrow { font-size: 7pt; font-weight: 800; text-transform: uppercase; letter-spacing: 0.18em; color: #64748b; margin-bottom: 5pt; }
  .report-header h1 { font-size: 22pt; font-weight: 900; letter-spacing: -0.025em; line-height: 1.1; }
  .report-header .meta { margin-top: 7pt; font-size: 8.5pt; color: #64748b; }
  .section-divider { margin-top: 22pt; margin-bottom: 10pt; padding-bottom: 5pt; border-bottom: 0.5pt solid #cbd5e1; page-break-after: avoid; }
  .section-divider span { font-size: 7pt; font-weight: 800; text-transform: uppercase; letter-spacing: 0.18em; color: #64748b; }
  h2 { font-size: 14pt; font-weight: 700; margin-top: 20pt; margin-bottom: 8pt; letter-spacing: -0.01em; page-break-after: avoid; }
  h3 { font-size: 11pt; font-weight: 700; margin-top: 14pt; margin-bottom: 4pt; page-break-after: avoid; }
  p { margin-bottom: 8pt; }
  ul, ol { padding-left: 18pt; margin-bottom: 8pt; }
  li { margin-bottom: 2pt; }
  .report-footer { margin-top: 36pt; padding-top: 10pt; border-top: 0.5pt solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; font-size: 7.5pt; color: #94a3b8; }
  .report-footer strong { font-weight: 700; color: #64748b; }
  @media screen { html { background: #e5e7eb; } body { max-width: 8.5in; margin: 32px auto; padding: 0.9in 1in 0.75in; background: white; box-shadow: 0 2px 12px rgba(0,0,0,0.12); min-height: 11in; } }
`;

export function printHeader(clientName: string, milestoneName: string, date: string): string {
  return `
    <div class="report-header">
      <p class="eyebrow">${esc(clientName)}</p>
      <h1>${esc(milestoneName)}</h1>
      <p class="meta">Submitted ${esc(date)}</p>
    </div>`;
}

export function printFooter(date: string): string {
  return `
    <div class="report-footer">
      <strong>Tayloe/Gray</strong>
      <span>Generated ${esc(new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }))}</span>
    </div>
    <script>window.addEventListener("load", function () { window.print(); });</script>`;
}

export function wrapPrintDoc(title: string, extraStyles: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${esc(title)}</title>
  <style>${BASE_PRINT_STYLES}${extraStyles}</style>
</head>
<body>${body}</body>
</html>`;
}

export function downloadMarkdown(content: string, filename: string): void {
  triggerDownload(new Blob([content], { type: "text/markdown" }), `${filename}.md`);
}

export async function downloadDocx(children: unknown[], filename: string): Promise<void> {
  const { Document, Packer } = await import("docx");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const doc = new Document({ sections: [{ children: children as any[] }] });
  const blob = await Packer.toBlob(doc);
  triggerDownload(blob, `${filename}.docx`);
}

export function safeFilename(name: string): string {
  return name.replace(/[^a-z0-9 _-]/gi, "").trim().replace(/\s+/g, "-").toLowerCase();
}
