"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Center, Stack, Paper, Text, TextInput, PasswordInput, Button, Alert, Box,
} from "@mantine/core";
import { redeemInvite } from "./actions";
import { AlertCircle } from "lucide-react";

export function AcceptInviteForm({
  token,
  email,
  role,
  companyName,
}: {
  token: string;
  email: string;
  role: string;
  companyName: string | null;
}) {
  const router = useRouter();
  const [name, setName]         = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  const isAdmin = role === "ADMIN";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await redeemInvite(token, name, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(false);
      return;
    }

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Account created but sign-in failed. Please go to the login page.");
      setLoading(false);
      return;
    }

    router.push(isAdmin ? "/admin" : "/portal");
    router.refresh();
  }

  return (
    <Center mih="100vh" bg="gray.0">
      <Stack w="100%" maw={400} px="md" align="center">
        {/* Logo */}
        <Stack align="center" mb="md" gap="xs">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon-tg-cow.svg" alt="T/G" width={48} height={48} />
          <Text fw={600} size="xl" c="gray.9">Welcome to TG Portal</Text>
          <Text size="sm" c="gray.5" style={{ textAlign: "center" }}>
            {isAdmin
              ? "You've been invited to join the Tayloe/Gray admin team."
              : <>
                  You&apos;ve been invited to access the portal for{" "}
                  <Text component="span" fw={500} c="gray.8">{companyName}</Text>.
                </>
            }
          </Text>
        </Stack>

        <Paper w="100%" p="xl" component="form" onSubmit={handleSubmit}>
          <Stack gap="md">
            {/* Signing up as */}
            <Box
              p="sm"
              style={{
                background: "var(--mantine-color-gray-0)",
                border: "1px solid var(--mantine-color-gray-2)",
                borderRadius: 4,
              }}
            >
              <Text size="xs" c="gray.4" mb={2}>Signing up as</Text>
              <Text size="sm" c="gray.8" fw={500}>{email}</Text>
            </Box>

            <TextInput
              label="Your name"
              placeholder="Jane Smith"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              required
            />
            <PasswordInput
              label="Create a password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
              minLength={8}
            />
            <PasswordInput
              label="Confirm password"
              placeholder="Re-enter your password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              required
            />

            {error && (
              <Alert icon={<AlertCircle size={14} />} color="red">
                {error}
              </Alert>
            )}

            <Button type="submit" fullWidth loading={loading}>
              Accept invitation
            </Button>
          </Stack>
        </Paper>

        <Text size="xs" c="gray.4">T/G Client Portal · Internal Use Only</Text>
      </Stack>
    </Center>
  );
}
