import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Stack, Group, Text, Badge, Box, Table, TableThead, TableTbody, TableTr, TableTh, TableTd, ActionIcon, Tooltip } from "@mantine/core";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { InviteAdminForm } from "@/components/admin/invite-admin-form";
import { RemoveAdminButton } from "@/components/admin/remove-admin-button";
import { PageTabBar } from "@/components/admin/page-tab-bar";
import { ActivityLogFeed } from "@/components/admin/activity-log-feed";
import { revokeAdminInvite } from "./actions";
import { X } from "lucide-react";

async function getTeamData() {
  const admins = await db.user.findMany({
    where: { role: "ADMIN" },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      _count: { select: { managedClients: true } },
    },
  });

  const pendingInvites = await db.inviteToken.findMany({
    where: { role: "ADMIN", usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
    select: { id: true, email: true, createdAt: true, expiresAt: true },
  });

  return { admins, pendingInvites };
}

async function getActivityLog() {
  return db.activityLog.findMany({
    where: { actorType: "ADMIN" },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export const metadata: Metadata = { title: "Team" };

export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/login");

  const { tab = "team" } = await searchParams;
  const { admins, pendingInvites } = await getTeamData();
  const logs = tab === "activity" ? await getActivityLog() : [];

  const otherAdmins = admins
    .filter((a) => a.id !== session.user.id)
    .map((a) => ({ id: a.id, name: a.name, email: a.email }));

  const TABS = [
    { value: "team", label: "Team" },
    { value: "activity", label: "Activity Log" },
  ];

  return (
    <Stack p={{ base: "md", sm: "xl" }} gap="xl" maw={1100}>
      <PageHeader
        title="Team"
        subtitle="Manage admin accounts and pending invites."
        actions={
          <Suspense>
            <PageTabBar tabs={TABS} defaultTab="team" />
          </Suspense>
        }
      />

      {tab === "activity" && (
        <SectionCard title="Admin Activity" noPadding>
          <ActivityLogFeed entries={logs} />
        </SectionCard>
      )}

      {tab !== "activity" && <>
      {/* Active admins */}
      <SectionCard title="Admins" noPadding>
        <Box style={{ overflowX: "auto" }}>
        <Table horizontalSpacing="md" verticalSpacing="sm">
          <TableThead>
            <TableTr>
              <TableTh>Name</TableTh>
              <TableTh>Email</TableTh>
              <TableTh>Clients</TableTh>
              <TableTh>Joined</TableTh>
              <TableTh style={{ width: 40 }} />
            </TableTr>
          </TableThead>
          <TableTbody>
            {admins.map((admin) => {
              const isSelf = admin.id === session.user.id;
              return (
                <TableTr key={admin.id}>
                  <TableTd>
                    <Group gap="xs">
                      <Text size="sm" fw={500} c="gray.9">
                        {admin.name ?? "—"}
                      </Text>
                      {isSelf && (
                        <Badge size="xs" variant="light" color="blue">You</Badge>
                      )}
                    </Group>
                  </TableTd>
                  <TableTd>
                    <Text size="sm" c="gray.6">{admin.email}</Text>
                  </TableTd>
                  <TableTd>
                    <Text size="sm" c="gray.7">{admin._count.managedClients}</Text>
                  </TableTd>
                  <TableTd>
                    <Text size="sm" c="gray.5">
                      {admin.createdAt.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </Text>
                  </TableTd>
                  <TableTd>
                    {!isSelf && (
                      <RemoveAdminButton
                        adminId={admin.id}
                        adminName={admin.name ?? admin.email}
                        clientCount={admin._count.managedClients}
                        otherAdmins={otherAdmins.filter((a) => a.id !== admin.id)}
                      />
                    )}
                  </TableTd>
                </TableTr>
              );
            })}
          </TableTbody>
        </Table>
        </Box>
      </SectionCard>

      {/* Pending invites */}
      {pendingInvites.length > 0 && (
        <SectionCard title="Pending invites" noPadding>
          <Box style={{ overflowX: "auto" }}>
          <Table horizontalSpacing="md" verticalSpacing="sm">
            <TableThead>
              <TableTr>
                <TableTh>Email</TableTh>
                <TableTh>Sent</TableTh>
                <TableTh>Expires</TableTh>
                <TableTh style={{ width: 40 }} />
              </TableTr>
            </TableThead>
            <TableTbody>
              {pendingInvites.map((invite) => (
                <TableTr key={invite.id}>
                  <TableTd>
                    <Text size="sm" c="gray.7">{invite.email}</Text>
                  </TableTd>
                  <TableTd>
                    <Text size="sm" c="gray.5">
                      {invite.createdAt.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </Text>
                  </TableTd>
                  <TableTd>
                    <Text size="sm" c="gray.5">
                      {invite.expiresAt.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </Text>
                  </TableTd>
                  <TableTd>
                    <form
                      action={async () => {
                        "use server";
                        await revokeAdminInvite(invite.id);
                      }}
                    >
                      <Tooltip label="Revoke invite" withArrow>
                        <ActionIcon
                          type="submit"
                          variant="subtle"
                          color="gray"
                          size="sm"
                          style={{ cursor: "pointer" }}
                          aria-label="Revoke invite"
                        >
                          <X size={14} />
                        </ActionIcon>
                      </Tooltip>
                    </form>
                  </TableTd>
                </TableTr>
              ))}
            </TableTbody>
          </Table>
          </Box>
        </SectionCard>
      )}

      {/* Invite form */}
      <SectionCard
        title="Invite admin"
        description="Send an invite to a new @tayloegray.com team member."
      >
        <InviteAdminForm />
      </SectionCard>
      </>}
    </Stack>
  );
}
