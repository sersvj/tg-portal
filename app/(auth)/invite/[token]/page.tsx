import type { Metadata } from "next";
import { db } from "@/lib/db";
import { Center, Stack, Paper, Text } from "@mantine/core";
import { LinkButton } from "@/components/ui/link-components";
import { AcceptInviteForm } from "./accept-form";
import { BRAND } from "@/lib/theme";

export const metadata: Metadata = { title: "Accept Invite" };

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const invite = await db.inviteToken.findUnique({
    where: { token },
    include: { client: { select: { companyName: true } } },
  });

  if (!invite) {
    return <InviteError message="This invite link is invalid or doesn't exist." />;
  }

  if (invite.usedAt) {
    return (
      <InviteError
        message="This invite link has already been used."
        hint="If you already have an account, sign in below."
        showLogin
      />
    );
  }

  if (invite.expiresAt < new Date()) {
    return (
      <InviteError
        message="This invite link has expired."
        hint={
          invite.role === "ADMIN"
            ? "Please ask another admin to send a new invite."
            : "Please ask your account manager to send a new invite."
        }
      />
    );
  }

  const isAdminInvite = invite.role === "ADMIN";
  const existingUser = await db.user.findUnique({ where: { email: invite.email } });

  if (existingUser) {
    // For client invites, link to client if not already linked
    if (!isAdminInvite && invite.clientId) {
      await db.clientUser.upsert({
        where: { clientId_userId: { clientId: invite.clientId, userId: existingUser.id } },
        create: { clientId: invite.clientId, userId: existingUser.id },
        update: {},
      });
    }
    await db.inviteToken.update({ where: { token }, data: { usedAt: new Date() } });

    return (
      <InviteError
        heading="You already have an account"
        message={
          isAdminInvite
            ? `Your account (${invite.email}) already exists. Sign in to access the admin panel.`
            : `Your account (${invite.email}) has been linked to ${invite.client?.companyName ?? "your client"}.`
        }
        hint="Sign in to continue."
        showLogin
      />
    );
  }

  return (
    <AcceptInviteForm
      token={token}
      email={invite.email}
      role={invite.role}
      companyName={invite.client?.companyName ?? null}
    />
  );
}

function InviteError({
  heading = "Invite unavailable",
  message,
  hint,
  showLogin,
}: {
  heading?: string;
  message: string;
  hint?: string;
  showLogin?: boolean;
}) {
  return (
    <Center mih="100vh" bg="gray.0">
      <Stack w="100%" maw={400} px="md" align="center">
        <Stack align="center" mb="md" gap="xs">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon-tg-cow.svg" alt="T/G" width={48} height={48} />
          <Text fw={600} size="xl" c="gray.9">TG Portal</Text>
        </Stack>

        <Paper w="100%" p="xl" style={{ textAlign: "center" }}>
          <Text fw={600} size="sm" c="gray.9" mb="xs">{heading}</Text>
          <Text size="sm" c="gray.5">{message}</Text>
          {hint && <Text size="sm" c="gray.5" mt={4}>{hint}</Text>}
          {showLogin && (
            <LinkButton
              href="/login"
              variant="light"
              size="xs"
              mt="md"
            >
              Go to sign in →
            </LinkButton>
          )}
        </Paper>

        <Text size="xs" c="gray.4">T/G Client Portal · Internal Use Only</Text>
      </Stack>
    </Center>
  );
}
