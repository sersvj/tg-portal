"use client";

import { useState } from "react";
import { Box, Group, Text, Stack, Badge, ScrollArea } from "@mantine/core";
import { User, ImageIcon } from "lucide-react";

type StaffProfile = {
  id: string;
  name: string;
  title: string | null;
  bio: string | null;
  headshotFilename: string | null;
  noHeadshot: boolean;
  order: number;
};

export function StaffProfileViewer({ profiles }: { profiles: StaffProfile[] }) {
  const [selectedId, setSelectedId] = useState(profiles[0]?.id ?? null);
  const selected = profiles.find((p) => p.id === selectedId) ?? null;

  return (
    <Group gap={0} align="flex-start" wrap="nowrap" style={{ minHeight: 300 }}>
      {/* Member list */}
      <Box
        style={{
          width: 220,
          flexShrink: 0,
          borderRight: "1px solid var(--mantine-color-gray-2)",
        }}
      >
        <ScrollArea>
          <Stack gap={0}>
            {profiles.map((p) => {
              const isSelected = p.id === selectedId;
              return (
                <Box
                  key={p.id}
                  px="md"
                  py="sm"
                  onClick={() => setSelectedId(p.id)}
                  style={{
                    cursor: "pointer",
                    borderLeft: `3px solid ${isSelected ? "var(--mantine-color-blue-5)" : "transparent"}`,
                    background: isSelected ? "var(--mantine-color-blue-0)" : undefined,
                    transition: "background 120ms",
                  }}
                >
                  <Text size="sm" fw={isSelected ? 600 : 400} c={isSelected ? "blue.7" : "gray.8"} truncate>
                    {p.name}
                  </Text>
                  {p.title && (
                    <Text size="xs" c="gray.5" truncate>{p.title}</Text>
                  )}
                </Box>
              );
            })}
          </Stack>
        </ScrollArea>
      </Box>

      {/* Detail panel */}
      <Box p="lg" style={{ flex: 1, minWidth: 0 }}>
        {selected ? (
          <Stack gap="md">
            <Box>
              <Group gap="xs" align="baseline" wrap="nowrap">
                <User size={14} style={{ color: "var(--mantine-color-gray-4)", flexShrink: 0 }} />
                <Text fw={700} fz={18} c="gray.9" style={{ letterSpacing: "-0.01em" }}>
                  {selected.name}
                </Text>
              </Group>
              {selected.title && (
                <Text size="sm" c="gray.5" mt={2} ml={22}>{selected.title}</Text>
              )}
            </Box>

            {selected.bio ? (
              <Box>
                <Text size="xs" fw={700} tt="uppercase" lts="0.08em" c="gray.5" mb={6}>Bio</Text>
                <Box
                  style={{
                    fontSize: 14,
                    color: "var(--mantine-color-gray-7)",
                    lineHeight: 1.65,
                    borderLeft: "2px solid var(--mantine-color-gray-2)",
                    paddingLeft: 12,
                  }}
                  dangerouslySetInnerHTML={{ __html: selected.bio }}
                />
              </Box>
            ) : (
              <Text size="sm" c="gray.4" fs="italic">No bio provided.</Text>
            )}

            <Box>
              <Text size="xs" fw={700} tt="uppercase" lts="0.08em" c="gray.5" mb={6}>Headshot</Text>
              {selected.noHeadshot ? (
                <Badge color="gray" variant="light" size="sm">No headshot</Badge>
              ) : selected.headshotFilename ? (
                <Badge color="teal" variant="light" size="sm" leftSection={<ImageIcon size={11} />}>
                  {selected.headshotFilename}
                </Badge>
              ) : (
                <Badge color="yellow" variant="light" size="sm">Not uploaded</Badge>
              )}
            </Box>
          </Stack>
        ) : (
          <Text size="sm" c="gray.4">Select a team member to view their profile.</Text>
        )}
      </Box>
    </Group>
  );
}
