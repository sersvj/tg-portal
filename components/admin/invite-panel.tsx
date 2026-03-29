"use client";

import { useState, useTransition } from "react";
import { sendInvite } from "@/app/(admin)/admin/clients/[id]/actions";
import {
  Stack, Group, Text, Button, Select, Alert, Badge, Box, Code,
  ActionIcon, CopyButton, Tooltip,
} from "@mantine/core";
import { Mail, Copy, Check, AlertCircle } from "lucide-react";

type Contact = { name: string; email: string };

export function InvitePanel({
  clientId,
  contacts,
  existingInvites,
}: {
  clientId: string;
  contacts: Contact[];
  existingInvites: { email: string; createdAt: Date; usedAt: Date | null }[];
}) {
  const [pending, startTransition] = useTransition();
  const [selectedEmail, setSelectedEmail] = useState(contacts[0]?.email ?? "");
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [error, setError] = useState("");

  function handleSend() {
    if (!selectedEmail) return;
    setError("");
    setInviteUrl(null);
    startTransition(async () => {
      try {
        const result = await sendInvite(clientId, selectedEmail);
        setInviteUrl(result.inviteUrl);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to send invite.");
      }
    });
  }

  const usedInvites    = existingInvites.filter((i) => i.usedAt);
  const pendingInvites = existingInvites.filter((i) => !i.usedAt);

  const selectData = contacts.map((c) => ({
    value: c.email,
    label: `${c.name} (${c.email})`,
  }));

  return (
    <Stack gap="sm">
      {/* Selector + Send */}
      <Group gap="xs" align="flex-end">
        <Select
          style={{ flex: 1 }}
          size="xs"
          placeholder="No contacts — add one first"
          data={selectData}
          value={selectedEmail}
          onChange={(v) => setSelectedEmail(v ?? "")}
          disabled={contacts.length === 0}
        />
        <Button
          size="xs"
          leftSection={<Mail size={12} />}
          loading={pending}
          disabled={!selectedEmail}
          onClick={handleSend}
        >
          Send invite
        </Button>
      </Group>

      {error && (
        <Alert icon={<AlertCircle size={14} />} color="red" py="xs">
          {error}
        </Alert>
      )}

      {/* Generated link */}
      {inviteUrl && (
        <Box
          p="xs"
          style={{
            border: "1px solid var(--mantine-color-blue-2)",
            borderRadius: 4,
            background: "var(--mantine-color-blue-0)",
          }}
        >
          <Text size="xs" fw={600} c="blue.7" mb={4}>Invite link generated</Text>
          <Group gap="xs" wrap="nowrap">
            <Code
              style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
              fz="xs"
            >
              {inviteUrl}
            </Code>
            <CopyButton value={inviteUrl} timeout={2000}>
              {({ copied, copy }) => (
                <Tooltip label={copied ? "Copied!" : "Copy link"} withArrow>
                  <ActionIcon
                    variant="light"
                    color={copied ? "green" : "blue"}
                    size="sm"
                    onClick={copy}
                  >
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                  </ActionIcon>
                </Tooltip>
              )}
            </CopyButton>
          </Group>
        </Box>
      )}

      {/* History */}
      {existingInvites.length > 0 && (
        <Box>
          <Text size="xs" fw={700} tt="uppercase" lts="0.08em" c="gray.5" mb={6}>
            History
          </Text>
          <Stack gap={4}>
            {usedInvites.map((inv, i) => (
              <Group key={i} justify="space-between">
                <Text size="xs" c="gray.7">{inv.email}</Text>
                <Badge color="green" variant="light" size="xs">Accepted</Badge>
              </Group>
            ))}
            {pendingInvites.map((inv, i) => (
              <Group key={i} justify="space-between">
                <Text size="xs" c="gray.7">{inv.email}</Text>
                <Badge color="gray" variant="light" size="xs">Pending</Badge>
              </Group>
            ))}
          </Stack>
        </Box>
      )}
    </Stack>
  );
}
