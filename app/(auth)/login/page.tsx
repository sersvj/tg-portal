"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Center,
  Stack,
  Title,
  Text,
  TextInput,
  PasswordInput,
  Button,
  Alert,
  Paper,
  Box,
} from "@mantine/core";
import { AlertCircle } from "lucide-react";
import { BRAND } from "@/lib/theme";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (result?.error) { setError("Invalid email or password."); return; }
    router.push("/");
    router.refresh();
  }

  return (
    <Center mih="100vh" bg="gray.0" p="md">
      <Box w="100%" maw={380}>
        {/* Logo */}
        <Stack align="center" gap="xs" mb="xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon-tg-cow.svg" alt="T/G" width={44} height={44} />
          <Title order={1} size="h2" fw={900} lts="-0.02em" mt="xs">
            T<span style={{ color: BRAND.orange }}>/</span>G Portal
          </Title>
          <Text size="sm" c="gray.5">
            Sign in to continue
          </Text>
        </Stack>

        {/* Card */}
        <Paper withBorder shadow="sm" p="xl" radius="md">
          <form onSubmit={handleSubmit}>
            <Stack gap="md">
              <TextInput
                id="email"
                type="email"
                label="Email"
                placeholder="you@example.com"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                size="md"
              />

              <PasswordInput
                id="password"
                label="Password"
                placeholder="••••••••"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                size="md"
              />

              {error && (
                <Alert
                  icon={<AlertCircle size={16} />}
                  color="red"
                  variant="light"
                  radius="sm"
                >
                  {error}
                </Alert>
              )}

              <Button
                type="submit"
                loading={loading}
                fullWidth
                size="md"
                mt="xs"
              >
                Sign in
              </Button>

              <Text ta="center" size="xs" c="gray.5">
                <a href="/forgot-password" style={{ color: "inherit" }}>Forgot your password?</a>
              </Text>
            </Stack>
          </form>
        </Paper>

        <Text
          ta="center"
          size="10px"
          fw={700}
          tt="uppercase"
          lts="0.15em"
          c="gray.4"
          mt="xl"
        >
          T/G Client Portal · Internal Use Only
        </Text>
      </Box>
    </Center>
  );
}
