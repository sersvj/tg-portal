"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Stack, Group, Box, Text, Button, Modal, TextInput,
  Checkbox, FileInput, Alert, ActionIcon, Badge, Anchor,
} from "@mantine/core";
import Link from "next/link";
import { Pencil, Trash2, UserPlus, AlertCircle, User, ImageIcon, CheckCircle } from "lucide-react";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { saveStaffMember, deleteStaffMember, submitStaffMilestone } from "./actions";

type StaffProfile = {
  id: string;
  name: string;
  title: string | null;
  bio: string | null;
  headshotFilename: string | null;
  noHeadshot: boolean;
  order: number;
};

interface StaffManagerProps {
  milestoneId: string;
  initialProfiles: StaffProfile[];
  hasDropboxFolder: boolean;
}

export function StaffManager({ milestoneId, initialProfiles, hasDropboxFolder }: StaffManagerProps) {
  const router = useRouter();
  const [profiles, setProfiles] = useState(initialProfiles);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<StaffProfile | null>(null);
  const [isPending, startTransition] = useTransition();
  const [submitError, setSubmitError] = useState("");
  const [formError, setFormError] = useState("");

  // Sync with server data after refresh
  useEffect(() => { setProfiles(initialProfiles); }, [initialProfiles]);

  function openAdd() { setEditing(null); setFormError(""); setModalOpen(true); }
  function openEdit(p: StaffProfile) { setEditing(p); setFormError(""); setModalOpen(true); }
  function closeModal() { setModalOpen(false); setEditing(null); setFormError(""); }

  async function handleSave(formData: FormData) {
    setFormError("");
    startTransition(async () => {
      try {
        await saveStaffMember(milestoneId, formData);
        router.refresh();
        closeModal();
      } catch (e) {
        setFormError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  async function handleDelete(profileId: string) {
    startTransition(async () => {
      await deleteStaffMember(milestoneId, profileId);
      router.refresh();
    });
  }

  async function handleSubmit() {
    setSubmitError("");
    startTransition(async () => {
      try {
        await submitStaffMilestone(milestoneId);
        router.push("/portal");
      } catch (e) {
        setSubmitError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  return (
    <>
      <Stack gap="md">
        {profiles.length === 0 ? (
          <Box
            p="xl"
            style={{
              border: "1px dashed var(--mantine-color-gray-3)",
              borderRadius: 4,
              textAlign: "center",
            }}
          >
            <User size={24} style={{ color: "var(--mantine-color-gray-3)", margin: "0 auto 8px" }} />
            <Text size="sm" c="gray.5">No team members added yet.</Text>
          </Box>
        ) : (
          <Stack gap="xs">
            {profiles.map((p) => (
              <Box
                key={p.id}
                p="md"
                style={{
                  border: "1px solid var(--mantine-color-gray-2)",
                  borderRadius: 4,
                  background: "white",
                }}
              >
                <Group justify="space-between" align="flex-start" wrap="nowrap">
                  <Box style={{ minWidth: 0 }}>
                    <Group gap="xs" wrap="nowrap">
                      <Text size="sm" fw={600} c="gray.9">{p.name}</Text>
                      {p.title && <Text size="sm" c="gray.5">· {p.title}</Text>}
                    </Group>
                    <Group gap="xs" mt={4}>
                      {p.noHeadshot ? (
                        <Badge color="gray" variant="light" size="xs">No headshot</Badge>
                      ) : p.headshotFilename ? (
                        <Badge color="teal" variant="light" size="xs" leftSection={<ImageIcon size={10} />}>{p.headshotFilename}</Badge>
                      ) : (
                        <Badge color="yellow" variant="light" size="xs">No headshot uploaded yet</Badge>
                      )}
                    </Group>
                  </Box>
                  <Group gap={4} style={{ flexShrink: 0 }}>
                    <ActionIcon
                      variant="subtle"
                      color="gray"
                      size="sm"
                      onClick={() => openEdit(p)}
                      aria-label="Edit"
                    >
                      <Pencil size={13} />
                    </ActionIcon>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      size="sm"
                      onClick={() => handleDelete(p.id)}
                      loading={isPending}
                      aria-label="Delete"
                    >
                      <Trash2 size={13} />
                    </ActionIcon>
                  </Group>
                </Group>
              </Box>
            ))}
          </Stack>
        )}

        <Button
          fullWidth
          variant="default"
          leftSection={<UserPlus size={14} />}
          onClick={openAdd}
        >
          Add team member
        </Button>

        <Button
          fullWidth
          variant="default"
          color="gray"
          onClick={() => router.push("/portal")}
        >
          Save &amp; come back later
        </Button>

        {submitError && (
          <Alert icon={<AlertCircle size={14} />} color="red" variant="light" p="xs">
            <Text size="xs">{submitError}</Text>
          </Alert>
        )}

        <Button
          fullWidth
          color="green"
          loading={isPending}
          disabled={profiles.length === 0}
          leftSection={<CheckCircle size={14} />}
          onClick={handleSubmit}
        >
          I&apos;m done — submit for review
        </Button>
      </Stack>

      <Modal
        opened={modalOpen}
        onClose={closeModal}
        title={editing ? "Edit team member" : "Add team member"}
        size="xl"
        zIndex={300}
      >
        <StaffForm
          editing={editing}
          hasDropboxFolder={hasDropboxFolder}
          error={formError}
          isPending={isPending}
          onSave={handleSave}
          onCancel={closeModal}
        />
      </Modal>
    </>
  );
}

function StaffForm({
  editing,
  hasDropboxFolder,
  error,
  isPending,
  onSave,
  onCancel,
}: {
  editing: StaffProfile | null;
  hasDropboxFolder: boolean;
  error: string;
  isPending: boolean;
  onSave: (formData: FormData) => void;
  onCancel: () => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [noHeadshot, setNoHeadshot] = useState(editing?.noHeadshot ?? false);
  const [bio, setBio] = useState(editing?.bio ?? "");

  // Reset state when switching between add/edit
  useEffect(() => {
    setNoHeadshot(editing?.noHeadshot ?? false);
    setBio(editing?.bio ?? "");
  }, [editing]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formRef.current) return;
    const fd = new FormData(formRef.current);
    fd.set("noHeadshot", String(noHeadshot));
    fd.set("bio", bio);
    if (editing) fd.set("profileId", editing.id);
    onSave(fd);
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit}>
      <Stack gap="md">
        <TextInput
          name="name"
          label="Full name"
          defaultValue={editing?.name ?? ""}
          required
          size="sm"
        />
        <TextInput
          name="title"
          label="Title / Role"
          placeholder="e.g. Director of Marketing"
          defaultValue={editing?.title ?? ""}
          size="sm"
        />
        <Box>
          <Text size="sm" fw={500} mb={4}>Bio</Text>
          <RichTextEditor
            value={bio}
            onChange={setBio}
            placeholder="Short bio for website use..."
            minHeight={200}
          />
        </Box>

        <Box>
          <Checkbox
            label="No headshot needed"
            checked={noHeadshot}
            onChange={(e) => setNoHeadshot(e.currentTarget.checked)}
            size="sm"
            mb="xs"
          />
          {!noHeadshot && (
            hasDropboxFolder ? (
              <>
                <FileInput
                  name="headshot"
                  label="Headshot"
                  placeholder={editing?.headshotFilename ?? "Upload headshot image..."}
                  accept="image/*"
                  size="sm"
                  leftSection={<ImageIcon size={14} />}
                />
                {editing?.headshotFilename && (
                  <Text size="xs" c="gray.5" mt={4}>
                    Current: {editing.headshotFilename} — upload a new file to replace it
                  </Text>
                )}
              </>
            ) : (
              <Alert color="yellow" variant="light" p="xs">
                <Text size="xs">
                  Headshot uploads require a Dropbox folder to be configured. Contact your account manager.
                </Text>
              </Alert>
            )
          )}
        </Box>

        {error && (
          <Alert icon={<AlertCircle size={14} />} color="red" variant="light" p="xs">
            <Text size="xs">{error}</Text>
          </Alert>
        )}

        <Group justify="flex-end" gap="sm">
          <Button variant="subtle" color="gray" size="sm" onClick={onCancel} type="button">
            Cancel
          </Button>
          <Button type="submit" size="sm" loading={isPending}>
            {editing ? "Save changes" : "Add team member"}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
