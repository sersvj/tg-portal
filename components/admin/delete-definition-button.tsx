"use client";

import { useTransition, useState } from "react";
import { ActionIcon, Modal, Text, Group, Button, Tooltip } from "@mantine/core";
import { Trash2 } from "lucide-react";
import { deleteMilestoneDefinition } from "@/app/(admin)/admin/milestones/actions";

export function DeleteDefinitionButton({
  id,
  name,
  inUse,
}: {
  id: string;
  name: string;
  inUse: number;
}) {
  const [pending, startTransition] = useTransition();
  const [opened, setOpened] = useState(false);

  function handleConfirm() {
    setOpened(false);
    startTransition(async () => {
      await deleteMilestoneDefinition(id);
    });
  }

  const tooltipLabel = inUse > 0
    ? `Delete (removes ${inUse} assignment${inUse !== 1 ? "s" : ""})`
    : "Delete";

  return (
    <>
      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title="Delete milestone type"
        size="sm"
        centered
        zIndex={400}
      >
        <Text size="sm" c="gray.7" mb="lg">
          Delete <strong>{name}</strong>?
          {inUse > 0 && (
            <> This will also remove it from{" "}
              <strong>{inUse} client assignment{inUse !== 1 ? "s" : ""}</strong>.
            </>
          )}{" "}
          This cannot be undone.
        </Text>
        <Group justify="flex-end" gap="xs">
          <Button variant="default" size="xs" onClick={() => setOpened(false)}>
            Cancel
          </Button>
          <Button color="red" size="xs" onClick={handleConfirm} loading={pending}>
            Delete
          </Button>
        </Group>
      </Modal>

      <Tooltip label={tooltipLabel}>
        <ActionIcon
          variant="subtle"
          color="red"
          size="sm"
          disabled={pending}
          onClick={() => setOpened(true)}
        >
          <Trash2 size={14} />
        </ActionIcon>
      </Tooltip>
    </>
  );
}
