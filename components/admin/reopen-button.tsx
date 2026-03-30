"use client";

import { useTransition } from "react";
import { Button, Group, Text } from "@mantine/core";
import { RotateCcw } from "lucide-react";

interface ReopenButtonProps {
  milestoneId: string;
  clientId: string;
  reopenAction: (milestoneId: string, clientId: string) => Promise<void>;
}

export function ReopenButton({ milestoneId, clientId, reopenAction }: ReopenButtonProps) {
  const [pending, startTransition] = useTransition();

  return (
    <Group gap="md" align="center">
      <Button
        variant="subtle"
        color="gray"
        size="xs"
        leftSection={<RotateCcw size={12} />}
        loading={pending}
        onClick={() => startTransition(() => reopenAction(milestoneId, clientId))}
      >
        Reopen milestone
      </Button>
      <Text size="xs" c="gray.4">This will set the milestone back to active so the client can make changes.</Text>
    </Group>
  );
}
