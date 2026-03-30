"use client";

import { useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Stack, Box, Group, Text, Button, Alert,
} from "@mantine/core";
import { Upload, X, CheckCircle, AlertCircle, FileUp } from "lucide-react";
import { uploadMilestoneFile, completeMilestone } from "@/app/(portal)/portal/upload/[milestoneId]/actions";

type UploadedFile = { id: string; filename: string; sizeBytes: number };
type QueuedFile   = { id: string; file: File; status: "pending" | "uploading" | "done" | "error"; error?: string };

type Props = {
  milestoneId: string;
  uploadedFiles: UploadedFile[];
  hasDropboxFolder: boolean;
};

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function UploadForm({ milestoneId, uploadedFiles: initial, hasDropboxFolder }: Props) {
  const router   = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [queue, setQueue]             = useState<QueuedFile[]>([]);
  const [uploaded, setUploaded]       = useState<UploadedFile[]>(initial);
  const [uploading, setUploading]     = useState(false);
  const [completing, startCompleting] = useTransition();
  const [completeError, setCompleteError] = useState("");
  const [dragOver, setDragOver]       = useState(false);

  function addFiles(files: FileList | File[]) {
    const items: QueuedFile[] = Array.from(files).map((file) => ({
      id: crypto.randomUUID(), file, status: "pending",
    }));
    setQueue((q) => [...q, ...items]);
  }

  async function handleUpload() {
    const pending = queue.filter((f) => f.status === "pending");
    if (!pending.length) return;
    setUploading(true);
    for (const item of pending) {
      setQueue((q) => q.map((f) => f.id === item.id ? { ...f, status: "uploading" } : f));
      try {
        const fd = new FormData();
        fd.append("files", item.file);
        await uploadMilestoneFile(milestoneId, fd);
        setUploaded((u) => [...u, { id: crypto.randomUUID(), filename: item.file.name, sizeBytes: item.file.size }]);
        setQueue((q) => q.map((f) => f.id === item.id ? { ...f, status: "done" } : f));
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Upload failed";
        setQueue((q) => q.map((f) => f.id === item.id ? { ...f, status: "error", error: msg } : f));
      }
    }
    setUploading(false);
    setQueue((q) => q.filter((f) => f.status !== "done"));
  }

  function handleComplete() {
    setCompleteError("");
    startCompleting(async () => {
      try {
        await completeMilestone(milestoneId);
        router.push("/portal");
        router.refresh();
      } catch (err) {
        setCompleteError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  if (!hasDropboxFolder) {
    return (
      <Alert icon={<AlertCircle size={14} />} color="yellow" title="Upload not configured">
        Your account manager hasn&apos;t set up a destination for this milestone yet. Please reach out to them.
      </Alert>
    );
  }

  const hasPending  = queue.some((f) => f.status === "pending");
  const hasUploaded = uploaded.length > 0;

  return (
    <Stack gap="md">

      {/* Drop zone */}
      <Box
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: 140,
          border: `2px dashed ${dragOver ? "var(--mantine-color-blue-4)" : "var(--mantine-color-gray-3)"}`,
          borderRadius: 4,
          background: dragOver ? "var(--mantine-color-blue-0)" : "var(--mantine-color-gray-0)",
          cursor: "pointer",
          transition: "border-color 0.15s, background 0.15s",
          userSelect: "none",
        }}
      >
        <FileUp size={20} style={{ marginBottom: 8, color: dragOver ? "var(--mantine-color-blue-5)" : "var(--mantine-color-gray-4)" }} />
        <Text size="sm" fw={500} c="gray.7">Drop files here or click to browse</Text>
        <Text size="xs" c="gray.4" mt={4}>Any file type · Max 150 MB per file</Text>
        <input
          ref={inputRef}
          type="file"
          multiple
          style={{ position: "absolute", opacity: 0, width: 0, height: 0 }}
          onChange={(e) => e.target.files && addFiles(e.target.files)}
        />
      </Box>

      {/* Queued files */}
      {queue.length > 0 && (
        <Box style={{ border: "1px solid var(--mantine-color-gray-2)", borderRadius: 4, overflow: "hidden" }}>
          <Box
            px="md"
            py="xs"
            style={{ borderBottom: "1px solid var(--mantine-color-gray-1)", background: "var(--mantine-color-gray-0)" }}
          >
            <Text size="xs" fw={700} tt="uppercase" lts="0.1em" c="gray.5">
              Ready to upload ({queue.filter((f) => f.status === "pending").length})
            </Text>
          </Box>
          <Stack gap={0}>
            {queue.map((item, i) => (
              <Group
                key={item.id}
                px="md"
                py="sm"
                gap="sm"
                wrap="nowrap"
                style={{
                  borderTop: i > 0 ? "1px solid var(--mantine-color-gray-1)" : undefined,
                }}
              >
                <Box style={{ width: 14, flexShrink: 0 }}>
                  {item.status === "uploading" && (
                    <div className="animate-spin" style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid var(--mantine-color-blue-4)", borderTopColor: "transparent" }} />
                  )}
                  {item.status === "done"    && <CheckCircle size={14} style={{ color: "var(--mantine-color-green-6)" }} />}
                  {item.status === "error"   && <AlertCircle size={14} style={{ color: "var(--mantine-color-red-6)" }} />}
                  {item.status === "pending" && <Box style={{ width: 14, height: 14, border: "1px solid var(--mantine-color-gray-3)", borderRadius: 2 }} />}
                </Box>
                <Box style={{ flex: 1, minWidth: 0 }}>
                  <Text size="sm" c="gray.8" truncate>{item.file.name}</Text>
                  {item.status === "error" && (
                    <Text size="xs" c="red.6" mt={2}>{item.error}</Text>
                  )}
                </Box>
                <Text size="xs" c="gray.5" style={{ flexShrink: 0 }}>{formatSize(item.file.size)}</Text>
                {item.status === "pending" && (
                  <Box
                    component="button"
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setQueue((q) => q.filter((f) => f.id !== item.id)); }}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: "var(--mantine-color-gray-5)", flexShrink: 0 }}
                  >
                    <X size={13} />
                  </Box>
                )}
              </Group>
            ))}
          </Stack>
        </Box>
      )}

      {/* Already uploaded */}
      {hasUploaded && (
        <Box style={{ border: "1px solid var(--mantine-color-gray-2)", borderRadius: 4, overflow: "hidden" }}>
          <Box
            px="md"
            py="xs"
            style={{ borderBottom: "1px solid var(--mantine-color-gray-1)", background: "var(--mantine-color-gray-0)" }}
          >
            <Text size="xs" fw={700} tt="uppercase" lts="0.1em" c="gray.5">
              Uploaded ({uploaded.length})
            </Text>
          </Box>
          <Stack gap={0}>
            {uploaded.map((f, i) => (
              <Group
                key={f.id}
                justify="space-between"
                px="md"
                py="sm"
                wrap="nowrap"
                style={{ borderTop: i > 0 ? "1px solid var(--mantine-color-gray-1)" : undefined }}
              >
                <Group gap="xs" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
                  <CheckCircle size={14} style={{ color: "var(--mantine-color-green-5)", flexShrink: 0 }} />
                  <Text size="sm" c="gray.8" truncate>{f.filename}</Text>
                </Group>
                <Text size="xs" c="gray.5" style={{ flexShrink: 0 }}>{formatSize(f.sizeBytes)}</Text>
              </Group>
            ))}
          </Stack>
        </Box>
      )}

      {/* Actions */}
      <Stack gap="xs" pt={4}>
        {hasPending && (
          <Button
            fullWidth
            loading={uploading}
            leftSection={<Upload size={14} />}
            onClick={handleUpload}
          >
            Upload {queue.filter((f) => f.status === "pending").length} file{queue.filter((f) => f.status === "pending").length !== 1 ? "s" : ""}
          </Button>
        )}

        {hasUploaded && !hasPending && !uploading && (
          <>
            <Button
              fullWidth
              variant="default"
              leftSection={<Upload size={14} />}
              onClick={() => inputRef.current?.click()}
            >
              Add more files
            </Button>
            <Button
              fullWidth
              variant="default"
              onClick={() => router.push("/portal")}
            >
              Save &amp; come back later
            </Button>
            <Button
              fullWidth
              color="green"
              loading={completing}
              leftSection={<CheckCircle size={14} />}
              onClick={handleComplete}
            >
              I&apos;m done — submit for review
            </Button>
          </>
        )}
      </Stack>

      {completeError && (
        <Alert icon={<AlertCircle size={14} />} color="red">
          {completeError}
        </Alert>
      )}

    </Stack>
  );
}
