import { Group, Text, type MantineColor } from "@mantine/core";

interface StatCardProps {
  label: string;
  value: number | string;
  color?: MantineColor;
}

/** Compact inline stat — used in dashboard and clients page. */
export function StatCard({ label, value, color = "gray.9" }: StatCardProps) {
  return (
    <Group
      gap={6}
      align="baseline"
      px="md"
      py="xs"
      style={{ background: "var(--mantine-color-gray-1)", borderRadius: 4 }}
    >
      <Text fw={700} size="sm" c={color} ff="monospace">
        {value}
      </Text>
      <Text size="sm" c="gray.6" fw={500}>
        {label}
      </Text>
    </Group>
  );
}
