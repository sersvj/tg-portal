import { Paper, Text, Group, Divider, type PaperProps, type MantineColor } from "@mantine/core";
import type { ReactNode } from "react";

interface SectionCardProps extends PaperProps {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  /** Accent color for the top border stripe */
  accent?: MantineColor;
  noPadding?: boolean;
}

/**
 * Consistent section container used throughout admin and portal.
 * Has an optional titled header row and an actions slot.
 */
export function SectionCard({
  title,
  description,
  actions,
  children,
  noPadding,
  ...paperProps
}: SectionCardProps) {
  const hasHeader = title || actions;
  return (
    <Paper radius="sm" withBorder {...paperProps}>
      {hasHeader && (
        <>
          <Group justify="space-between" align="center" px="md" py="sm">
            <div>
              {title && (
                <Text size="xs" fw={700} tt="uppercase" lts="0.08em" c="gray.5">
                  {title}
                </Text>
              )}
              {description && (
                <Text size="xs" c="gray.5" mt={2}>
                  {description}
                </Text>
              )}
            </div>
            {actions && <Group gap="xs">{actions}</Group>}
          </Group>
          <Divider />
        </>
      )}
      <div style={noPadding ? undefined : { padding: "var(--mantine-spacing-md)" }}>
        {children}
      </div>
    </Paper>
  );
}
