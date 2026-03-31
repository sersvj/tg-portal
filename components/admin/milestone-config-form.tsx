"use client";

import { useState, useTransition, useRef } from "react";
import { Stack, Group, Textarea, Text, Button, Alert, Box } from "@mantine/core";
import { FolderOpen, AlertCircle, CheckCircle2 } from "lucide-react";
import { DropboxFolderPicker } from "./dropbox-folder-picker";
import { saveMilestoneConfig } from "@/app/(admin)/admin/clients/[id]/milestones/[milestoneId]/actions";

type Props = {
  milestoneId: string;
  clientId: string;
  initialInstructions: string | null;
  initialFolderPath: string | null;
  showDropbox?: boolean;
};

export function MilestoneConfigForm({
  milestoneId,
  clientId,
  initialInstructions,
  initialFolderPath,
  showDropbox = true,
}: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [folderPath, setFolderPath] = useState(initialFolderPath ?? "");
  const [pending, startTransition]  = useTransition();
  const [saved, setSaved]           = useState(false);
  const [error, setError]           = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaved(false);
    const fd = new FormData(formRef.current!);
    fd.set("dropboxFolderPath", folderPath);
    startTransition(async () => {
      try {
        await saveMilestoneConfig(milestoneId, clientId, fd);
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit}>
      <Stack gap="lg">

        {/* Instructions */}
        <Textarea
          name="instructions"
          label="Client Instructions"
          description="Shown to the client when they open this milestone in the portal."
          placeholder="Tell the client exactly what to upload — file formats, naming conventions, what to include, etc."
          defaultValue={initialInstructions ?? ""}
          rows={4}
          autosize
          minRows={4}
        />

        {/* Dropbox folder */}
        {showDropbox && <Stack gap="xs">
          <Text size="sm" fw={500} c="gray.9">Dropbox Destination Folder</Text>
          <Text size="xs" c="gray.5">Files uploaded by the client will land in this Dropbox folder. The folder will be created if it doesn&apos;t exist.</Text>

          {folderPath ? (
            <Box
              p="sm"
              style={{
                border: "1px solid var(--mantine-color-green-3)",
                borderRadius: 4,
                background: "var(--mantine-color-green-0)",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <FolderOpen size={14} style={{ color: "var(--mantine-color-green-6)", flexShrink: 0 }} />
              <Text size="sm" ff="monospace" c="gray.9" style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {folderPath}
              </Text>
            </Box>
          ) : (
            <Box
              p="sm"
              style={{
                border: "1px dashed var(--mantine-color-gray-3)",
                borderRadius: 4,
                background: "var(--mantine-color-gray-0)",
              }}
            >
              <Text size="xs" c="gray.5">No folder mapped — uploads will fail until one is selected.</Text>
            </Box>
          )}

          <DropboxFolderPicker currentPath={folderPath || null} onSelect={setFolderPath} />
        </Stack>}

        {error && (
          <Alert icon={<AlertCircle size={14} />} color="red">
            {error}
          </Alert>
        )}

        <Group gap="sm" align="center">
          <Button type="submit" loading={pending}>
            Save configuration
          </Button>
          {saved && (
            <Group gap={4}>
              <CheckCircle2 size={14} style={{ color: "var(--mantine-color-green-6)" }} />
              <Text size="sm" c="green.6" fw={500}>Saved</Text>
            </Group>
          )}
        </Group>

      </Stack>
    </form>
  );
}
