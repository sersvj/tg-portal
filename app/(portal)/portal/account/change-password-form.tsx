"use client";

import { useState } from "react";
import { Stack, PasswordInput, Button, Alert, Text } from "@mantine/core";
import { CheckCircle, AlertCircle } from "lucide-react";
import { changePasswordClient } from "./actions";

export function ChangePasswordForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext]       = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSuccess(false);
    if (next.length < 8) { setError("New password must be at least 8 characters."); return; }
    if (next !== confirm) { setError("Passwords do not match."); return; }
    setLoading(true);
    const result = await changePasswordClient({ currentPassword: current, newPassword: next });
    setLoading(false);
    if (result.error) { setError(result.error); return; }
    setSuccess(true);
    setCurrent(""); setNext(""); setConfirm("");
  }

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap="md">
        <PasswordInput
          label="Current password"
          autoComplete="current-password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          required
          size="sm"
        />
        <PasswordInput
          label="New password"
          autoComplete="new-password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          required
          size="sm"
        />
        <PasswordInput
          label="Confirm new password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          size="sm"
        />
        {error && (
          <Alert icon={<AlertCircle size={14} />} color="red" variant="light" p="xs">
            <Text size="xs">{error}</Text>
          </Alert>
        )}
        {success && (
          <Alert icon={<CheckCircle size={14} />} color="green" variant="light" p="xs">
            <Text size="xs">Password changed successfully.</Text>
          </Alert>
        )}
        <Button type="submit" loading={loading} size="sm" style={{ alignSelf: "flex-start" }}>
          Change password
        </Button>
      </Stack>
    </form>
  );
}
