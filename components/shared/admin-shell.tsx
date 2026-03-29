"use client";

import { AppShell, Group, Text, Box } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { SidebarNav, MobileNavToggle } from "@/components/shared/sidebar-nav";
import type { ReactNode } from "react";
import { BRAND } from "@/lib/theme";

export function AdminShell({ children }: { children: ReactNode }) {
  const [opened, { toggle, close }] = useDisclosure();

  return (
    <AppShell
      navbar={{ width: 208, breakpoint: "sm", collapsed: { mobile: !opened } }}
      header={{ height: { base: 52, sm: 0 } }}
      padding={0}
    >
      {/* Mobile header — only visible below sm breakpoint */}
      <AppShell.Header hiddenFrom="sm" h={52}>
        <Group h="100%" px="md" justify="space-between">
          <Group gap="xs">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon-tg-cow.svg" alt="T/G" width={20} height={20} />
            <Text size="sm" fw={700} c="gray.9">
              T<Text component="span" style={{ color: BRAND.orange }}>/</Text>G Portal
            </Text>
          </Group>
          <MobileNavToggle opened={opened} toggle={toggle} />
        </Group>
      </AppShell.Header>

      <SidebarNav onNavigate={close} />

      <AppShell.Main>
        {/* Close mobile nav on content tap */}
        <Box
          onClick={() => { if (opened) close(); }}
          style={{ minHeight: "100vh" }}
        >
          {children}
        </Box>
      </AppShell.Main>
    </AppShell>
  );
}
