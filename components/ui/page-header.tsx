"use client";

import { Group, Text, Title, type GroupProps } from "@mantine/core";
import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  groupProps?: GroupProps;
}

/** Consistent page-level header used across admin and portal. */
export function PageHeader({ title, subtitle, actions, groupProps }: PageHeaderProps) {
  return (
    <Group justify="space-between" align="flex-start" mb={{ base: "sm", sm: "xl" }} {...groupProps}>
      <div>
        <Title order={1} size="h2" fw={800} lts="-0.03em">
          {title}
        </Title>
        {subtitle && (
          <Text size="sm" c="gray.5" mt={4}>
            {subtitle}
          </Text>
        )}
      </div>
      {actions && <Group gap="sm">{actions}</Group>}
    </Group>
  );
}
