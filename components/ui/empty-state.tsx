import { Stack, Text, type MantineColor } from "@mantine/core";
import type { ReactNode, ElementType } from "react";

interface EmptyStateProps {
  icon?: ElementType;
  title: string;
  description?: string;
  action?: ReactNode;
  color?: MantineColor;
}

/** Consistent empty/zero-state display used in tables and lists. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  color = "gray",
}: EmptyStateProps) {
  return (
    <Stack align="center" py={60} px="xl" gap="sm">
      {Icon && (
        <Icon
          size={32}
          style={{ color: `var(--mantine-color-${color}-4)` }}
        />
      )}
      <Text fw={600} size="sm" c="gray.7" ta="center">
        {title}
      </Text>
      {description && (
        <Text size="sm" c="gray.5" ta="center" maw={320}>
          {description}
        </Text>
      )}
      {action}
    </Stack>
  );
}
