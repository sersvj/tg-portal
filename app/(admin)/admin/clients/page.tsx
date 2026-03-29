import type { Metadata } from "next";
import { db } from "@/lib/db";
import { Suspense } from "react";
import { Stack, Group } from "@mantine/core";
import { Plus } from "lucide-react";
import { LinkButton } from "@/components/ui/link-components";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { ClientSearch } from "@/components/admin/client-search";
import { ClientTable } from "@/components/admin/client-table";

async function getClients(query: string, showInactive: boolean) {
  return db.client.findMany({
    orderBy: { createdAt: "desc" },
    where: {
      ...(showInactive ? {} : { isActive: true }),
      ...(query ? {
        OR: [
          { companyName: { contains: query, mode: "insensitive" } },
          { industry:    { contains: query, mode: "insensitive" } },
          { contacts: { some: { name:  { contains: query, mode: "insensitive" } } } },
          { contacts: { some: { email: { contains: query, mode: "insensitive" } } } },
        ],
      } : {}),
    },
    include: {
      primaryAdmin: { select: { name: true } },
      milestones: { select: { status: true } },
    },
  });
}

export const metadata: Metadata = { title: "All Clients" };

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; inactive?: string }>;
}) {
  const { q = "", inactive } = await searchParams;
  const showInactive = inactive === "1";
  const clients = await getClients(q, showInactive);

  const totalClients        = clients.filter((c) => c.isActive).length;
  const activeMilestones    = clients.filter((c) => c.isActive).reduce((s, c) => s + c.milestones.filter(m => m.status === "ACTIVE").length, 0);
  const completedMilestones = clients.filter((c) => c.isActive).reduce((s, c) => s + c.milestones.filter(m => m.status === "COMPLETED").length, 0);

  return (
    <Stack p={{ base: "md", sm: "xl" }} gap="xl" maw={1100}>
      <PageHeader
        title="All Clients"
        subtitle="Every client across all admins"
        actions={
          <LinkButton href="/admin/clients/new" leftSection={<Plus size={14} />}>
            New Client
          </LinkButton>
        }
      />

      <Group gap="xs">
        <StatCard label="Active Clients"       value={totalClients}        color="gray.9" />
        <StatCard label="Active Milestones"    value={activeMilestones}    color="blue" />
        <StatCard label="Completed Milestones" value={completedMilestones} color="green" />
      </Group>

      <ClientTable
        clients={clients}
        query={q}
        showInactive={showInactive}
        toolbar={
          <Group>
            <Suspense><ClientSearch showInactive={showInactive} /></Suspense>
          </Group>
        }
      />
    </Stack>
  );
}
