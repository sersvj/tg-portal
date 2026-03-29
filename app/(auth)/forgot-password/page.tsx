"use client";

import { useState } from "react";
import {
  Center, Box, Stack, Title, Text, TextInput, Button, Alert, Paper,
} from "@mantine/core";
import { CheckCircle, AlertCircle } from "lucide-react";
import { LinkAnchor } from "@/components/ui/link-components";
import { requestPasswordReset } from "./actions";
import { BRAND } from "@/lib/theme";

export default function ForgotPasswordPage() {
  const [email, setEmail]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError]       = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await requestPasswordReset(email);
      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Center mih="100vh" bg="gray.0" p="md">
      <Box w="100%" maw={380}>
        <Stack align="center" gap="xs" mb="xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon-tg-cow.svg" alt="T/G" width={44} height={44} />
          <Title order={1} size="h2" fw={900} lts="-0.02em" mt="xs">
            T<span style={{ color: BRAND.orange }}>/</span>G Portal
          </Title>
          <Text size="sm" c="gray.5">Reset your password</Text>
        </Stack>

        <Paper withBorder shadow="sm" p="xl" radius="md">
          {submitted ? (
            <Stack align="center" gap="md">
              <CheckCircle size={32} style={{ color: "var(--mantine-color-green-6)" }} />
              <Text fw={600} c="gray.9" ta="center">Check your email</Text>
              <Text size="sm" c="gray.5" ta="center">
                If an account exists for <strong>{email}</strong>, you'll receive a reset link shortly.
              </Text>
              <LinkAnchor href="/login" size="sm" c="blue.6">← Back to sign in</LinkAnchor>
            </Stack>
          ) : (
            <form onSubmit={handleSubmit}>
              <Stack gap="md">
                <Text size="sm" c="gray.6">
                  Enter your email and we'll send you a link to reset your password.
                </Text>

                <TextInput
                  type="email"
                  label="Email"
                  placeholder="you@tayloegray.com"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  size="md"
                />

                {error && (
                  <Alert icon={<AlertCircle size={16} />} color="red" variant="light" radius="sm">
                    {error}
                  </Alert>
                )}

                <Button type="submit" loading={loading} fullWidth size="md" mt="xs">
                  Send reset link
                </Button>

                <LinkAnchor href="/login" size="sm" c="gray.5" style={{ textAlign: "center" }}>
                  ← Back to sign in
                </LinkAnchor>
              </Stack>
            </form>
          )}
        </Paper>

        <Text ta="center" size="10px" fw={700} tt="uppercase" lts="0.15em" c="gray.4" mt="xl">
          T/G Client Portal · Internal Use Only
        </Text>
      </Box>
    </Center>
  );
}
