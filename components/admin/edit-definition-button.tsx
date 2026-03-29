"use client";

import { useTransition, useState } from "react";
import { ActionIcon, Modal, TextInput, Textarea, Group, Button, Tooltip } from "@mantine/core";
import { Pencil } from "lucide-react";
import { updateMilestoneDefinition } from "@/app/(admin)/admin/milestones/actions";

export function EditDefinitionButton({
  id,
  name,
  description,
}: {
  id: string;
  name: string;
  description: string | null;
}) {
  const [opened, setOpened] = useState(false);
  const [nameVal, setNameVal] = useState(name);
  const [descVal, setDescVal] = useState(description ?? "");
  const [pending, startTransition] = useTransition();

  function handleOpen() {
    setNameVal(name);
    setDescVal(description ?? "");
    setOpened(true);
  }

  function handleSave() {
    if (!nameVal.trim()) return;
    startTransition(async () => {
      await updateMilestoneDefinition(id, nameVal, descVal || null);
      setOpened(false);
    });
  }

  return (
    <>
      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title="Edit milestone"
        size="sm"
        centered
        zIndex={400}
      >
        <TextInput
          label="Name"
          value={nameVal}
          onChange={(e) => setNameVal(e.target.value)}
          required
          size="sm"
          mb="sm"
        />
        <Textarea
          label="Description (optional)"
          placeholder="Short description shown to clients"
          value={descVal}
          onChange={(e) => setDescVal(e.target.value)}
          size="sm"
          autosize
          minRows={2}
          mb="lg"
        />
        <Group justify="flex-end" gap="xs">
          <Button variant="default" size="xs" onClick={() => setOpened(false)}>
            Cancel
          </Button>
          <Button size="xs" onClick={handleSave} loading={pending} disabled={!nameVal.trim()}>
            Save
          </Button>
        </Group>
      </Modal>

      <Tooltip label="Edit">
        <ActionIcon
          variant="subtle"
          color="gray"
          size="sm"
          onClick={handleOpen}
        >
          <Pencil size={14} />
        </ActionIcon>
      </Tooltip>
    </>
  );
}
