"use client";

import { useState } from "react";
import { Stack, PasswordInput, Button, Alert, Text } from "@mantine/core";
import { CheckCircle, AlertCircle } from "lucide-react";
import { LinkButton } from "@/components/ui/link-components";
import { resetPassword } from "./actions";

export function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword]   = useState("");
  const [confirm, setConfirm]     = useState("");
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [success, setSuccess]     = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }
    setLoading(true);
    const result = await resetPassword(token, password);
    setLoading(false);
    if (result.error) { setError(result.error); return; }
    setSuccess(true);
  }

  if (success) {
    return (
      <Stack align="center" gap="md">
        <CheckCircle size={32} style={{ color: "var(--mantine-color-green-6)" }} />
        <Text fw={600} c="gray.9" ta="center">Password updated</Text>
        <Text size="sm" c="gray.5" ta="center">You can now sign in with your new password.</Text>
        <LinkButton href="/login" variant="light" color="blue" size="sm">
          Go to sign in
        </LinkButton>
      </Stack>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap="md">
        <PasswordInput
          label="New password"
          placeholder="At least 8 characters"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          size="md"
        />
        <PasswordInput
          label="Confirm new password"
          placeholder="••••••••"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          size="md"
        />

        {error && (
          <Alert icon={<AlertCircle size={16} />} color="red" variant="light" radius="sm">
            {error}
          </Alert>
        )}

        <Button type="submit" loading={loading} fullWidth size="md" mt="xs">
          Set new password
        </Button>
      </Stack>
    </form>
  );
}
