import type { Metadata } from "next";
import { db } from "@/lib/db";
import { Center, Box, Stack, Title, Text, Paper } from "@mantine/core";
import { LinkButton } from "@/components/ui/link-components";
import { ResetPasswordForm } from "./reset-form";
import { BRAND } from "@/lib/theme";

export const metadata: Metadata = { title: "Reset Password" };

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const record = await db.passwordResetToken.findUnique({ where: { token } });

  const isInvalid = !record || !!record.usedAt;
  const isExpired = record && !record.usedAt && record.expiresAt < new Date();

  return (
    <Center mih="100vh" bg="gray.0" p="md">
      <Box w="100%" maw={380}>
        <Stack align="center" gap="xs" mb="xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon-tg-cow.svg" alt="T/G" width={44} height={44} />
          <Title order={1} size="h2" fw={900} lts="-0.02em" mt="xs">
            T<span style={{ color: BRAND.orange }}>/</span>G Portal
          </Title>
          <Text size="sm" c="gray.5">
            {isInvalid || isExpired ? "Link unavailable" : "Set a new password"}
          </Text>
        </Stack>

        <Paper withBorder shadow="sm" p="xl" radius="md">
          {isInvalid && (
            <Stack align="center" gap="md">
              <Text size="sm" c="gray.6" ta="center">
                This reset link is invalid or has already been used.
              </Text>
              <LinkButton href="/forgot-password" variant="light" size="sm">
                Request a new link
              </LinkButton>
            </Stack>
          )}
          {isExpired && (
            <Stack align="center" gap="md">
              <Text size="sm" c="gray.6" ta="center">
                This reset link has expired.
              </Text>
              <LinkButton href="/forgot-password" variant="light" size="sm">
                Request a new link
              </LinkButton>
            </Stack>
          )}
          {!isInvalid && !isExpired && (
            <ResetPasswordForm token={token} />
          )}
        </Paper>

        <Text ta="center" size="10px" fw={700} tt="uppercase" lts="0.15em" c="gray.4" mt="xl">
          T/G Client Portal · Internal Use Only
        </Text>
      </Box>
    </Center>
  );
}
