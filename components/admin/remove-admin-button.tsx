"use client";

import { useState, useTransition } from "react";
import { removeAdmin } from "@/app/(admin)/admin/team/actions";
import {
  ActionIcon, Modal, Stack, Text, Button, Group, Select, Alert,
} from "@mantine/core";
import { Trash2, AlertCircle } from "lucide-react";

type OtherAdmin = { id: string; name: string | null; email: string };

export function RemoveAdminButton({
  adminId,
  adminName,
  clientCount,
  otherAdmins,
}: {
  adminId: string;
  adminName: string;
  clientCount: number;
  otherAdmins: OtherAdmin[];
}) {
  const [open, setOpen]               = useState(false);
  const [reassignTo, setReassignTo]   = useState<string | null>(null);
  const [error, setError]             = useState("");
  const [pending, startTransition]    = useTransition();

  const hasClients = clientCount > 0;

  function handleOpen() {
    setReassignTo(null);
    setError("");
    setOpen(true);
  }

  function handleConfirm() {
    if (hasClients && !reassignTo) {
      setError("Select an admin to reassign clients to.");
      return;
    }
    setError("");
    startTransition(async () => {
      try {
        await removeAdmin(adminId, reassignTo);
        setOpen(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to remove admin.");
      }
    });
  }

  const selectData = otherAdmins.map((a) => ({
    value: a.id,
    label: a.name ? `${a.name} (${a.email})` : a.email,
  }));

  return (
    <>
      <ActionIcon
        variant="subtle"
        color="red"
        size="sm"
        onClick={handleOpen}
        style={{ cursor: "pointer" }}
        aria-label={`Remove ${adminName}`}
      >
        <Trash2 size={14} />
      </ActionIcon>

      <Modal
        opened={open}
        onClose={() => setOpen(false)}
        title={`Remove ${adminName}`}
        size="sm"
      >
        <Stack gap="md">
          {hasClients ? (
            <>
              <Text size="sm" c="gray.7">
                {adminName} manages{" "}
                <Text component="span" fw={600} c="gray.9">
                  {clientCount} {clientCount === 1 ? "client" : "clients"}
                </Text>
                . Reassign them before removing this admin.
              </Text>
              <Select
                label="Reassign clients to"
                placeholder="Select an admin"
                data={selectData}
                value={reassignTo}
                onChange={setReassignTo}
                size="sm"
              />
            </>
          ) : (
            <Text size="sm" c="gray.7">
              Are you sure you want to remove <Text component="span" fw={600} c="gray.9">{adminName}</Text>? This cannot be undone.
            </Text>
          )}

          {error && (
            <Alert icon={<AlertCircle size={14} />} color="red" py="xs">
              {error}
            </Alert>
          )}

          <Group justify="flex-end" gap="xs">
            <Button variant="default" size="xs" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              color="red"
              size="xs"
              loading={pending}
              onClick={handleConfirm}
              disabled={hasClients && !reassignTo}
            >
              Remove admin
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
