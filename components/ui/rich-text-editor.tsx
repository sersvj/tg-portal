"use client";

import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { RichTextEditor as MantineRTE } from "@mantine/tiptap";
import {
  Bold, Italic, List, ListOrdered, Heading2, Heading3, Link2,
} from "lucide-react";
import { ActionIcon, Group, Tooltip } from "@mantine/core";
import { useEffect, useCallback } from "react";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Start typing...",
  minHeight = 180,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // Sync external value changes (e.g. when editing a different record)
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (current !== value) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
  }, [editor, value]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("URL", prev ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  if (!editor) return null;

  return (
    <MantineRTE editor={editor} style={{ minHeight }}>
      <MantineRTE.Toolbar>
        <Group gap={2}>
          <Tooltip label="Bold" withArrow>
            <ActionIcon
              variant={editor.isActive("bold") ? "light" : "subtle"}
              color={editor.isActive("bold") ? "blue" : "gray"}
              size="sm"
              onClick={() => editor.chain().focus().toggleBold().run()}
            >
              <Bold size={13} />
            </ActionIcon>
          </Tooltip>

          <Tooltip label="Italic" withArrow>
            <ActionIcon
              variant={editor.isActive("italic") ? "light" : "subtle"}
              color={editor.isActive("italic") ? "blue" : "gray"}
              size="sm"
              onClick={() => editor.chain().focus().toggleItalic().run()}
            >
              <Italic size={13} />
            </ActionIcon>
          </Tooltip>

          <Tooltip label="Heading 2" withArrow>
            <ActionIcon
              variant={editor.isActive("heading", { level: 2 }) ? "light" : "subtle"}
              color={editor.isActive("heading", { level: 2 }) ? "blue" : "gray"}
              size="sm"
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            >
              <Heading2 size={13} />
            </ActionIcon>
          </Tooltip>

          <Tooltip label="Heading 3" withArrow>
            <ActionIcon
              variant={editor.isActive("heading", { level: 3 }) ? "light" : "subtle"}
              color={editor.isActive("heading", { level: 3 }) ? "blue" : "gray"}
              size="sm"
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            >
              <Heading3 size={13} />
            </ActionIcon>
          </Tooltip>

          <Tooltip label="Bullet list" withArrow>
            <ActionIcon
              variant={editor.isActive("bulletList") ? "light" : "subtle"}
              color={editor.isActive("bulletList") ? "blue" : "gray"}
              size="sm"
              onClick={() => editor.chain().focus().toggleBulletList().run()}
            >
              <List size={13} />
            </ActionIcon>
          </Tooltip>

          <Tooltip label="Numbered list" withArrow>
            <ActionIcon
              variant={editor.isActive("orderedList") ? "light" : "subtle"}
              color={editor.isActive("orderedList") ? "blue" : "gray"}
              size="sm"
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
            >
              <ListOrdered size={13} />
            </ActionIcon>
          </Tooltip>

          <Tooltip label="Link" withArrow>
            <ActionIcon
              variant={editor.isActive("link") ? "light" : "subtle"}
              color={editor.isActive("link") ? "blue" : "gray"}
              size="sm"
              onClick={setLink}
            >
              <Link2 size={13} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </MantineRTE.Toolbar>

      <MantineRTE.Content />
    </MantineRTE>
  );
}
