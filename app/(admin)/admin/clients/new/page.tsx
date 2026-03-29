import type { Metadata } from "next";
import { db } from "@/lib/db";
import { Stack, Box } from "@mantine/core";
import { LinkAnchor } from "@/components/ui/link-components";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { NewClientForm } from "./new-client-form";

async function getAdmins() {
  return db.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });
}

export const metadata: Metadata = { title: "New Client" };

export default async function NewClientPage() {
  const admins = await getAdmins();

  return (
    <Stack p={{ base: "md", sm: "xl" }} gap="lg" maw={760}>
      <Box>
        <LinkAnchor
          href="/admin/clients"
          size="xs"
          c="gray.5"
          style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
        >
          <ArrowLeft size={11} /> Clients
        </LinkAnchor>
      </Box>

      <PageHeader
        title="New Client"
        subtitle="Fill in the details to create a new client entry."
      />

      <NewClientForm admins={admins} />
    </Stack>
  );
}
