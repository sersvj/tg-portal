"use client";

// Client-only export utilities for page content — dynamically imported.

type FieldAnswer = {
  fieldTemplate: { label: string; order: number };
  value: string;
};

type PageNode = {
  id: string;
  type: "PAGE" | "LABEL";
  title: string;
  isNA: boolean;
  content: string | null;
  order: number;
  parentId: string | null;
  children: PageNode[];
  answers: FieldAnswer[];
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function stripHtml(html: string): string {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent ?? div.innerText ?? "";
}

function orderedPages(nodes: PageNode[]): { page: PageNode; section: string | null }[] {
  const result: { page: PageNode; section: string | null }[] = [];
  let currentSection: string | null = null;
  for (const node of [...nodes].sort((a, b) => a.order - b.order)) {
    if (node.type === "LABEL") {
      currentSection = node.title;
      for (const child of [...node.children].sort((a, b) => a.order - b.order)) {
        if (child.type === "PAGE") result.push({ page: child, section: currentSection });
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

// ── Markdown export ───────────────────────────────────────────────────────────

export async function exportMarkdown(nodes: PageNode[], filename: string) {
  const TurndownService = (await import("turndown")).default;
  const td = new TurndownService({ headingStyle: "atx", bulletListMarker: "-" });

  let md = "";
  let lastSection: string | null = undefined as unknown as null;

  for (const { page, section } of orderedPages(nodes)) {
    if (section !== lastSection) {
      if (section) md += `\n---\n\n## ${section}\n\n`;
      lastSection = section;
    }

    md += `### ${page.title}\n\n`;

    if (page.isNA) {
      md += "_Not applicable._\n\n";
      continue;
    }

    if (page.content) {
      md += td.turndown(page.content) + "\n\n";
    }

    const sortedAnswers = [...page.answers].sort((a, b) => a.fieldTemplate.order - b.fieldTemplate.order);
    for (const ans of sortedAnswers) {
      md += `**${ans.fieldTemplate.label}**\n\n${ans.value}\n\n`;
    }
  }

  const blob = new Blob([md.trim()], { type: "text/markdown" });
  triggerDownload(blob, `${filename}.md`);
}

// ── Word (.docx) export ───────────────────────────────────────────────────────

export async function exportDocx(nodes: PageNode[], filename: string, clientName: string) {
  const {
    Document, Packer, Paragraph, TextRun, HeadingLevel,
    AlignmentType, PageBreak,
  } = await import("docx");

  const children: InstanceType<typeof Paragraph>[] = [];

  // Title
  children.push(
    new Paragraph({
      text: clientName,
      heading: HeadingLevel.TITLE,
    })
  );

  let lastSection: string | null = undefined as unknown as null;

  for (const { page, section } of orderedPages(nodes)) {
    if (section !== lastSection) {
      if (section) {
        children.push(new Paragraph({ children: [new PageBreak()] }));
        children.push(new Paragraph({ text: section, heading: HeadingLevel.HEADING_1 }));
      }
      lastSection = section;
    }

    children.push(new Paragraph({ text: page.title, heading: HeadingLevel.HEADING_2 }));

    if (page.isNA) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: "Not applicable.", italics: true, color: "888888" })],
        })
      );
      children.push(new Paragraph({}));
      continue;
    }

    if (page.content) {
      const paragraphs = htmlToDocxParagraphs(page.content);
      children.push(...paragraphs);
    }

    const sortedAnswers = [...page.answers].sort((a, b) => a.fieldTemplate.order - b.fieldTemplate.order);
    for (const ans of sortedAnswers) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: ans.fieldTemplate.label + ": ", bold: true })],
        })
      );
      // Field values may be plain text or HTML (rich TEXTAREA fields)
      if (/<[a-z][\s\S]*>/i.test(ans.value)) {
        children.push(...htmlToDocxParagraphs(ans.value));
      } else {
        children.push(new Paragraph({ text: ans.value }));
      }
    }

    children.push(new Paragraph({}));
  }

  const doc = new Document({
    sections: [{ children }],
  });

  const blob = await Packer.toBlob(doc);
  triggerDownload(blob, `${filename}.docx`);
}

// ── HTML → docx paragraphs (basic) ───────────────────────────────────────────

function htmlToDocxParagraphs(html: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { Paragraph, TextRun, HeadingLevel } = require("docx");

  const div = document.createElement("div");
  div.innerHTML = html;

  const result: InstanceType<typeof Paragraph>[] = [];

  for (const node of Array.from(div.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim();
      if (text) result.push(new Paragraph({ text }));
      continue;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) continue;
    const el = node as Element;
    const tag = el.tagName.toLowerCase();
    const text = el.textContent ?? "";

    if (tag === "h2") {
      result.push(new Paragraph({ text, heading: HeadingLevel.HEADING_3 }));
    } else if (tag === "h3") {
      result.push(new Paragraph({ text, heading: HeadingLevel.HEADING_4 }));
    } else if (tag === "ul" || tag === "ol") {
      for (const li of Array.from(el.querySelectorAll("li"))) {
        result.push(new Paragraph({ text: `• ${li.textContent ?? ""}` }));
      }
    } else if (tag === "blockquote") {
      result.push(
        new Paragraph({
          children: [new TextRun({ text: text.trim(), italics: true, color: "555555" })],
          indent: { left: 720 },
        })
      );
    } else if (tag === "pre" || tag === "code") {
      result.push(
        new Paragraph({
          children: [new TextRun({ text: text.trim(), font: "Courier New", size: 18 })],
        })
      );
    } else {
      // p, strong, em, span, etc. — extract inline runs
      const runs = extractRuns(el);
      if (runs.length) result.push(new Paragraph({ children: runs }));
    }
  }

  return result;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractRuns(el: Element): any[] {
  const { TextRun } = require("docx");
  const runs = [];

  for (const node of Array.from(el.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? "";
      if (text) runs.push(new TextRun({ text }));
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const child = node as Element;
      const tag = child.tagName.toLowerCase();
      const text = child.textContent ?? "";
      if (tag === "strong" || tag === "b") {
        runs.push(new TextRun({ text, bold: true }));
      } else if (tag === "em" || tag === "i") {
        runs.push(new TextRun({ text, italics: true }));
      } else if (tag === "code") {
        runs.push(new TextRun({ text, font: "Courier New", size: 18 }));
      } else if (tag === "a") {
        runs.push(new TextRun({ text, color: "1155CC", underline: {} }));
      } else {
        runs.push(new TextRun({ text }));
      }
    }
  }

  return runs;
}

// ── Download helper ───────────────────────────────────────────────────────────

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
