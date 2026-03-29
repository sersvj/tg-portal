"use client";

import { useState, useTransition } from "react";
import { inviteAdmin } from "@/app/(admin)/admin/team/actions";
import {
  Stack, Group, Text, TextInput, Button, Alert, Box, Code, ActionIcon, CopyButton, Tooltip,
} from "@mantine/core";
import { Mail, Copy, Check, AlertCircle } from "lucide-react";

export function InviteAdminForm() {
  const [pending, startTransition] = useTransition();
  const [email, setEmail]         = useState("");
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [error, setError]         = useState("");

  function handleSend() {
    if (!email.trim()) return;
    setError("");
    setInviteUrl(null);
    startTransition(async () => {
      try {
        const result = await inviteAdmin(email.trim());
        setInviteUrl(result.inviteUrl);
        setEmail("");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to send invite.");
      }
    });
  }

  return (
    <Stack gap="sm">
      <Group gap="xs" align="flex-end">
        <TextInput
          style={{ flex: 1 }}
          size="xs"
          placeholder="name@tayloegray.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          type="email"
        />
        <Button
          size="xs"
          leftSection={<Mail size={12} />}
          loading={pending}
          disabled={!email.trim()}
          onClick={handleSend}
        >
          Send invite
        </Button>
      </Group>

      <Text size="xs" c="gray.4">
        Only @tayloegray.com addresses are accepted.
      </Text>

      {error && (
        <Alert icon={<AlertCircle size={14} />} color="red" py="xs">
          {error}
        </Alert>
      )}

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
    </Stack>
  );
}
