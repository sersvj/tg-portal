import type { Metadata } from "next";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Image from "next/image";
import {
  Stack, Group, Grid, GridCol, Text, Badge, Avatar, Anchor,
  ActionIcon, Divider, Box, Button,
} from "@mantine/core";
import { LinkButton, LinkAnchor } from "@/components/ui/link-components";
import { toTelHref } from "@/lib/phone";
import { Suspense } from "react";
import { Globe, Mail, Phone, ArrowLeft, Pencil, PowerOff, Power, Eye } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { MilestoneToggle } from "@/components/admin/milestone-toggle";
import { InvitePanel } from "@/components/admin/invite-panel";
import { ClientLinksPanel } from "@/components/admin/client-links-panel";
import { toggleClientActive } from "./actions";
import { enterPortalPreview } from "@/app/(portal)/portal/preview-actions";
import { PageTabBar } from "@/components/admin/page-tab-bar";
import { ClientActionsMenu } from "@/components/admin/client-actions-menu";
import { ActivityLogFeed } from "@/components/admin/activity-log-feed";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const client = await db.client.findUnique({ where: { id }, select: { companyName: true } });
  return { title: client?.companyName ?? "Client" };
}

async function getClient(id: string) {
  return db.client.findUnique({
    where: { id },
    include: {
      primaryAdmin: { select: { id: true, name: true, email: true } },
      contacts: { orderBy: { order: "asc" } },
      milestones: {
        include: { milestoneDefinition: true },
        orderBy: { order: "asc" },
      },
      inviteTokens: {
        orderBy: { createdAt: "desc" },
        select: { email: true, createdAt: true, usedAt: true },
      },
      clientUsers: { include: { user: { select: { email: true } } } },
      links: { orderBy: { order: "asc" } },
    },
  });
}

async function getMilestoneDefinitions() {
  return db.milestoneDefinition.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
}

async function getClientLog(clientId: string) {
  return db.activityLog.findMany({
    where: { clientId },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

const CLIENT_TABS = [
  { value: "overview", label: "Overview" },
  { value: "activity", label: "Activity" },
];

export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab = "overview" } = await searchParams;
  const [client, definitions] = await Promise.all([getClient(id), getMilestoneDefinitions()]);

  if (!client) notFound();

  const logs = tab === "activity" ? await getClientLog(id) : [];

  const active  = client.milestones.filter((m) => m.status === "ACTIVE").length;
  const done    = client.milestones.filter((m) => m.status === "COMPLETED").length;
  const total   = client.milestones.length;
  const locked  = total - active - done;

  return (
    <Stack p={{ base: "md", sm: "xl" }} gap="xl" maw={1200}>

      {/* Inactive banner */}
      {!client.isActive && (
        <Box
          px="md"
          py="xs"
          style={{
            background: "var(--mantine-color-yellow-0)",
            border: "1px solid var(--mantine-color-yellow-3)",
            borderRadius: 4,
          }}
        >
          <Text size="xs" c="yellow.8" fw={500}>
            This client portal is inactive. The client cannot access their portal until it is reactivated.
          </Text>
        </Box>
      )}

      {/* Back nav */}
      <Box>
        <LinkAnchor
          href="/admin/clients"
          size="xs"
          c="gray.5"
          style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
        >
          <ArrowLeft size={11} />
          All Clients
        </LinkAnchor>
      </Box>

      {/* Header */}
      <Group justify="space-between" align="flex-start" wrap="nowrap" gap="sm">
        <Group gap="md" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
          <Avatar size={48} radius="sm" color="blue" style={{ flexShrink: 0 }}>
            {client.logoUrl ? (
              <Image
                src={client.logoUrl}
                alt={client.companyName}
                width={48}
                height={48}
                style={{ objectFit: "contain" }}
              />
            ) : (
              client.companyName.charAt(0).toUpperCase()
            )}
          </Avatar>
          <Box style={{ minWidth: 0 }}>
            <Text fw={700} size="xl" c="gray.9" truncate>{client.companyName}</Text>
            <Group gap="sm" mt={2} wrap="wrap">
              {client.industry && (
                <Text size="xs" c="gray.5">{client.industry}</Text>
              )}
              {client.website && (
                <Anchor
                  href={client.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  size="xs"
                  style={{ display: "inline-flex", alignItems: "center", gap: 3 }}
                >
                  <Globe size={10} />
                  {client.website.replace(/^https?:\/\//, "")}
                </Anchor>
              )}
              <Text size="xs" c="gray.5">
                <Text span c="gray.4">Primary Admin: </Text>
                {client.primaryAdmin.name ?? client.primaryAdmin.email}
              </Text>
            </Group>
          </Box>
        </Group>

        {/* Desktop actions */}
        <Group gap="sm" wrap="nowrap" style={{ flexShrink: 0 }} visibleFrom="sm">
          {active > 0 && <Badge color="blue" variant="light" size="sm">{active} active</Badge>}
          {done > 0 && <Badge color="green" variant="light" size="sm">{done} complete</Badge>}
          {locked > 0 && <Badge color="gray" variant="light" size="sm">{locked} locked</Badge>}

          <form
            action={async () => {
              "use server";
              await enterPortalPreview(id);
            }}
          >
            <Button
              type="submit"
              variant="default"
              size="xs"
              leftSection={<Eye size={12} />}
              style={{ cursor: "pointer" }}
            >
              Preview Portal
            </Button>
          </form>

          <form
            action={async () => {
              "use server";
              await toggleClientActive(id, !client.isActive);
            }}
          >
            <Button
              type="submit"
              variant="default"
              size="xs"
              color={client.isActive ? "yellow" : "green"}
              leftSection={client.isActive ? <PowerOff size={12} /> : <Power size={12} />}
            >
              {client.isActive ? "Deactivate" : "Reactivate"}
            </Button>
          </form>

          <LinkButton
            href={`/admin/clients/${id}/edit`}
            variant="default"
            size="xs"
            leftSection={<Pencil size={12} />}
          >
            Edit
          </LinkButton>
        </Group>

        {/* Mobile actions — three-dot menu */}
        <Box hiddenFrom="sm" style={{ flexShrink: 0 }}>
          <ClientActionsMenu
            clientId={id}
            isActive={client.isActive}
            editHref={`/admin/clients/${id}/edit`}
          />
        </Box>
      </Group>

      {/* Tab toggle */}
      <Suspense>
        <PageTabBar tabs={CLIENT_TABS} defaultTab="overview" />
      </Suspense>

      {/* Activity log tab */}
      {tab === "activity" && (
        <SectionCard title="Activity" noPadding>
          <ActivityLogFeed entries={logs} />
        </SectionCard>
      )}

      {/* Content grid */}
      {tab !== "activity" && <>
      <Grid gutter="lg">

        {/* Left: milestones + links */}
        <GridCol span={{ base: 12, sm: 7, md: 8 }}>
          <Stack gap="lg">
            <SectionCard
              title="Milestones"
              description={total > 0 ? `${done} of ${total} complete` : undefined}
              noPadding={false}
            >
              <MilestoneToggle
                clientId={client.id}
                definitions={definitions}
                assigned={client.milestones.map((m) => ({
                  id: m.id,
                  milestoneDefinitionId: m.milestoneDefinitionId,
                  status: m.status,
                  order: m.order,
                }))}
              />
            </SectionCard>

            <SectionCard title="Links" noPadding>
              <ClientLinksPanel
                clientId={client.id}
                links={client.links}
              />
            </SectionCard>
          </Stack>
        </GridCol>

        {/* Right: portal access + contacts */}
        <GridCol span={{ base: 12, sm: 5, md: 4 }}>
          <Stack gap="lg">

            {/* Portal Access */}
            <SectionCard title="Portal Access">
              {client.clientUsers.length > 0 && (
                <Stack gap={4} mb="sm">
                  {client.clientUsers.map((cu) => (
                    <Group key={cu.id} gap="xs">
                      <Box
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: "var(--mantine-color-green-6)",
                          flexShrink: 0,
                        }}
                      />
                      <Text size="xs" c="gray.7">{cu.user.email}</Text>
                    </Group>
                  ))}
                  <Divider my="xs" />
                </Stack>
              )}
              {client.clientUsers.length === 0 && (
                <Text size="xs" c="gray.5" mb="sm">No portal users yet.</Text>
              )}
              <InvitePanel
                clientId={client.id}
                contacts={client.contacts.map((c) => ({ name: c.name, email: c.email }))}
                existingInvites={client.inviteTokens}
              />
            </SectionCard>

            {/* Contacts */}
            <SectionCard
              title="Contacts"
              actions={
                <LinkAnchor
                  href={`/admin/clients/${id}/edit`}
                  size="xs"
                  c="gray.5"
                >
                  Edit
                </LinkAnchor>
              }
            >
              {client.contacts.length === 0 ? (
                <Text size="xs" c="gray.5">No contacts on record.</Text>
              ) : (
                <Stack gap="md">
                  {client.contacts.map((contact, i) => (
                    <Box key={contact.id}>
                      {i > 0 && <Divider mb="md" />}
                      <Group gap="sm" align="flex-start" wrap="nowrap">
                        <Avatar size={32} radius="sm" color="blue">
                          {contact.name.charAt(0).toUpperCase()}
                        </Avatar>
                        <Box style={{ flex: 1, minWidth: 0 }}>
                          <Group gap="xs" align="center" wrap="wrap">
                            <Text size="sm" fw={600} c="gray.9">{contact.name}</Text>
                            {contact.isPrimary && (
                              <Badge color="blue" variant="light" size="xs">Primary</Badge>
                            )}
                          </Group>
                          {contact.title && (
                            <Text size="xs" c="gray.5">{contact.title}</Text>
                          )}
                          <Stack gap={2} mt={4}>
                            <Anchor
                              href={`mailto:${contact.email}`}
                              size="xs"
                              style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
                            >
                              <Mail size={10} />
                              {contact.email}
                            </Anchor>
                            {contact.phone && (
                              <Anchor
                                href={toTelHref(contact.phone)}
                                size="xs"
                                c="gray.6"
                                style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
                              >
                                <Phone size={10} />
                                {contact.phone}
                              </Anchor>
                            )}
                          </Stack>
                        </Box>
                      </Group>
                    </Box>
                  ))}
                </Stack>
              )}
            </SectionCard>

          </Stack>
        </GridCol>

      </Grid>
      </>}
    </Stack>
  );
}
