"use client";

import { useState, useTransition } from "react";
import { Stack, Group, Box, Text, Button, ActionIcon, Code, Loader, UnstyledButton } from "@mantine/core";
import { ChevronRight, Folder, ArrowLeft, Check } from "lucide-react";
import { browseFolders } from "@/app/(admin)/admin/clients/[id]/milestones/[milestoneId]/actions";

type DBFolder = { name: string; path: string };

type Props = {
  currentPath: string | null;
  onSelect: (path: string) => void;
};

export function DropboxFolderPicker({ currentPath, onSelect }: Props) {
  const [open, setOpen]     = useState(false);
  const [cwd, setCwd]       = useState("/");
  const [stack, setStack]   = useState<string[]>([]);
  const [folders, setFolders] = useState<DBFolder[]>([]);
  const [pending, startTransition] = useTransition();
  const [error, setError]   = useState("");

  function openPicker() {
    setOpen(true);
    setCwd("/");
    setStack([]);
    loadFolders("/");
  }

  function loadFolders(path: string) {
    setError("");
    startTransition(async () => {
      try {
        const result = await browseFolders(path);
        setFolders(result);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load folders");
      }
    });
  }

  function enter(folder: DBFolder) {
    setStack((s) => [...s, cwd]);
    setCwd(folder.path);
    loadFolders(folder.path);
  }

  function back() {
    const prev = stack[stack.length - 1] ?? "/";
    setStack((s) => s.slice(0, -1));
    setCwd(prev);
    loadFolders(prev);
  }

  function select() {
    onSelect(cwd === "/" ? "" : cwd);
    setOpen(false);
  }

  if (!open) {
    return (
      <Button
        type="button"
        variant="default"
        size="xs"
        leftSection={<Folder size={12} />}
        onClick={openPicker}
      >
        {currentPath ? "Change folder" : "Browse Dropbox"}
      </Button>
    );
  }

  return (
    <Box
      style={{
        border: "1px solid var(--mantine-color-gray-2)",
        borderRadius: 4,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <Group
        gap="xs"
        px="sm"
        py="xs"
        style={{
          borderBottom: "1px solid var(--mantine-color-gray-1)",
          background: "var(--mantine-color-gray-0)",
        }}
      >
        {stack.length > 0 && (
          <ActionIcon
            variant="subtle"
            color="gray"
            size="sm"
            disabled={pending}
            onClick={back}
          >
            <ArrowLeft size={13} />
          </ActionIcon>
        )}
        <Code
          fz="xs"
          style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
        >
          {cwd === "/" ? "/ (root)" : cwd}
        </Code>
        {pending && <Loader size="xs" />}
      </Group>

      {/* Folder list */}
      <Box style={{ maxHeight: 208, overflowY: "auto" }}>
        {error && (
          <Text size="xs" c="red.6" px="sm" py="xs">{error}</Text>
        )}
        {!error && !pending && folders.length === 0 && (
          <Text size="xs" c="gray.4" fs="italic" px="sm" py="xs">No subfolders here</Text>
        )}
        {folders.map((f) => (
          <UnstyledButton
            key={f.path}
            type="button"
            onClick={() => enter(f)}
            style={{
              width: "100%",
              cursor: "pointer",
              borderTop: "1px solid var(--mantine-color-gray-1)",
              display: "block",
            }}
          >
          <Group
            gap="xs"
            px="sm"
            py="xs"
          >
            <Folder size={13} style={{ color: "var(--mantine-color-gray-5)", flexShrink: 0 }} />
            <Text size="sm" c="gray.8" style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {f.name}
            </Text>
            <ChevronRight size={12} style={{ color: "var(--mantine-color-gray-4)", flexShrink: 0 }} />
          </Group>
          </UnstyledButton>
        ))}
      </Box>

      {/* Actions */}
      <Group
        justify="space-between"
        px="sm"
        py="xs"
        style={{
          borderTop: "1px solid var(--mantine-color-gray-1)",
          background: "var(--mantine-color-gray-0)",
        }}
      >
        <Button
          type="button"
          variant="subtle"
          color="gray"
          size="xs"
          onClick={() => setOpen(false)}
        >
          Cancel
        </Button>
        <Button
          type="button"
          size="xs"
          leftSection={<Check size={11} />}
          disabled={cwd === "/"}
          onClick={select}
        >
          Select this folder
        </Button>
      </Group>
    </Box>
  );
}
