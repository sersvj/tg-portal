"use client";

import {
  Table, Badge, Text, Group, Avatar, Box, Button, Paper, Divider,
} from "@mantine/core";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/ui/empty-state";
import { Users, Plus } from "lucide-react";

type Client = {
  id: string;
  companyName: string;
  logoUrl: string | null;
  isActive: boolean;
  primaryAdmin: { name: string | null };
  milestones: { status: string }[];
};

interface ClientTableProps {
  clients: Client[];
  query: string;
  showInactive?: boolean;
  toolbar?: React.ReactNode;
}

/** Shared client list table used on dashboard and /clients pages. */
export function ClientTable({ clients, query, toolbar }: ClientTableProps) {
  const router = useRouter();

  return (
    <Paper withBorder radius="sm" style={{ overflow: "hidden" }}>
      {/* Toolbar */}
      {toolbar && (
        <>
          <Box px="md" py="sm">{toolbar}</Box>
          <Divider />
        </>
      )}

      {clients.length === 0 ? (
        <EmptyState
          icon={Users}
          title={query ? `No results for "${query}"` : "No clients yet"}
          description={
            query
              ? "Try a different search term."
              : "Create your first client to get started."
          }
          action={
            !query ? (
              <Button
                component={Link}
                href="/admin/clients/new"
                size="xs"
                leftSection={<Plus size={13} />}
              >
                Create client
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Box style={{ overflowX: "auto" }}>
        <Table highlightOnHover horizontalSpacing="md" verticalSpacing="sm">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Client</Table.Th>
              <Table.Th visibleFrom="sm">Admin</Table.Th>
              <Table.Th>Active</Table.Th>
              <Table.Th visibleFrom="xs">Done</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {clients.map((client) => {
              const active    = client.milestones.filter(m => m.status === "ACTIVE").length;
              const completed = client.milestones.filter(m => m.status === "COMPLETED").length;
              const total     = client.milestones.length;

              return (
                <Table.Tr
                  key={client.id}
                  style={{ cursor: "pointer", opacity: client.isActive ? 1 : 0.5 }}
                  onClick={() => router.push(`/admin/clients/${client.id}`)}
                >
                  <Table.Td>
                    <Group gap="sm">
                      <Avatar size={32} radius="sm" color={client.isActive ? "blue" : "gray"}>
                        {client.logoUrl ? (
                          <Image
                            src={client.logoUrl}
                            alt={client.companyName}
                            width={32}
                            height={32}
                            style={{ objectFit: "contain" }}
                          />
                        ) : (
                          client.companyName.charAt(0).toUpperCase()
                        )}
                      </Avatar>
                      <Box>
                        <Text fw={600} size="sm" c="gray.9">
                          {client.companyName}
                        </Text>
                        {!client.isActive && (
                          <Text size="xs" c="yellow.7" fw={500}>Inactive</Text>
                        )}
                      </Box>
                    </Group>
                  </Table.Td>
                  <Table.Td visibleFrom="sm">
                    <Text size="sm" c="gray.6">
                      {client.primaryAdmin.name ?? "—"}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    {total === 0 ? (
                      <Text size="sm" c="gray.4">—</Text>
                    ) : active > 0 ? (
                      <Badge color="blue" variant="light" size="sm">{active}</Badge>
                    ) : (
                      <Text size="sm" c="gray.4">0</Text>
                    )}
                  </Table.Td>
                  <Table.Td visibleFrom="xs">
                    {total === 0 ? (
                      <Text size="sm" c="gray.4">—</Text>
                    ) : completed > 0 ? (
                      <Badge color="green" variant="light" size="sm">{completed}</Badge>
                    ) : (
                      <Text size="sm" c="gray.4">0</Text>
                    )}
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
        </Box>
      )}
    </Paper>
  );
}
