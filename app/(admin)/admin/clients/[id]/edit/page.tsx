import type { Metadata } from "next";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { Stack, Box } from "@mantine/core";
import { LinkAnchor } from "@/components/ui/link-components";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EditClientForm } from "@/components/admin/edit-client-form";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const client = await db.client.findUnique({ where: { id }, select: { companyName: true } });
  return { title: `Edit ${client?.companyName ?? "Client"}` };
}

async function getClient(id: string) {
  return db.client.findUnique({
    where: { id },
    select: {
      id: true,
      companyName: true,
      industry: true,
      website: true,
      logoUrl: true,
      primaryAdminId: true,
      contacts: {
        orderBy: { order: "asc" },
        select: { name: true, title: true, phone: true, email: true },
      },
    },
  });
}

async function getAdmins() {
  return db.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });
}

export default async function EditClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [client, admins] = await Promise.all([getClient(id), getAdmins()]);

  if (!client) notFound();

  return (
    <Stack p={{ base: "md", sm: "xl" }} gap="lg" maw={760}>
      <Box>
        <LinkAnchor
          href={`/admin/clients/${id}`}
          size="xs"
          c="gray.5"
          style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
        >
          <ArrowLeft size={11} /> {client.companyName}
        </LinkAnchor>
      </Box>

      <PageHeader
        title="Edit Client"
        subtitle="Update company information, logo, and contacts."
      />

      <EditClientForm admins={admins} defaultValues={client} />
    </Stack>
  );
}
