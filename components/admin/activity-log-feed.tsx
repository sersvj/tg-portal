import { Box, Group, Stack, Text } from "@mantine/core";
import { describeAction, formatLogTime, groupLogsByDate } from "@/lib/activity-log-labels";

type LogEntry = {
  id: string;
  createdAt: Date;
  actorType: string;
  actorName: string;
  actorEmail: string;
  action: string;
  subjectName: string | null;
  subjectType: string | null;
  metadata: unknown;
};

function ActorDot({ actorType }: { actorType: string }) {
  const color =
    actorType === "CLIENT"
      ? "var(--mantine-color-green-6)"
      : "var(--mantine-color-blue-6)";
  return (
    <Box
      style={{
        width: 7,
        height: 7,
        borderRadius: "50%",
        background: color,
        flexShrink: 0,
        marginTop: 5,
      }}
    />
  );
}

function LogRow({ entry }: { entry: LogEntry }) {
  const description = describeAction({
    action: entry.action,
    actorType: entry.actorType,
    actorName: entry.actorName,
    actorEmail: entry.actorEmail,
    subjectName: entry.subjectName,
    subjectType: entry.subjectType,
    metadata: entry.metadata,
  });

  return (
    <Group gap="sm" align="flex-start" wrap="nowrap" py="xs" style={{ borderTop: "1px solid var(--mantine-color-gray-1)" }}>
      <ActorDot actorType={entry.actorType} />
      <Box style={{ flex: 1, minWidth: 0 }}>
        <Group justify="space-between" wrap="nowrap" gap="sm">
          <Text size="sm" c="gray.8" style={{ lineHeight: 1.4 }}>
            <Text span fw={700} size="xs" tt="uppercase" lts="0.06em" c={entry.actorType === "CLIENT" ? "green.7" : "blue.7"}>
              {entry.actorType}
            </Text>
            <Text span c="gray.4"> — </Text>
            <Text span fw={600} c="gray.9">{entry.actorName}</Text>
            {" "}
            {description}
          </Text>
          <Text size="xs" c="gray.4" style={{ flexShrink: 0 }}>
            {formatLogTime(new Date(entry.createdAt))}
          </Text>
        </Group>
        <Text size="xs" c="gray.4">{entry.actorEmail}</Text>
      </Box>
    </Group>
  );
}

export function ActivityLogFeed({ entries }: { entries: LogEntry[] }) {
  if (entries.length === 0) {
    return (
      <Box px="md" py="xl" style={{ textAlign: "center" }}>
        <Text size="sm" c="gray.4">No activity recorded yet.</Text>
      </Box>
    );
  }

  const groups = groupLogsByDate(entries);

  return (
    <Stack gap={0}>
      {groups.map((group) => (
        <Box key={group.label} px="md" pb="sm">
          <Text
            size="xs"
            fw={700}
            tt="uppercase"
            lts="0.08em"
            c="gray.4"
            pt="md"
            pb="xs"
          >
            {group.label}
          </Text>
          <Stack gap={0}>
            {group.entries.map((entry) => (
              <LogRow key={entry.id} entry={entry} />
            ))}
          </Stack>
        </Box>
      ))}
    </Stack>
  );
}
