"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  AppShell,
  NavLink,
  Stack,
  Group,
  Text,
  Divider,
  UnstyledButton,
  Box,
} from "@mantine/core";
import {
  LayoutDashboard,
  Users,
  Flag,
  LogOut,
  UsersRound,
  UserCircle,
} from "lucide-react";
import { BRAND } from "@/lib/theme";

const navItems = [
  { href: "/admin",            label: "Dashboard",  icon: LayoutDashboard, exact: true },
  { href: "/admin/clients",    label: "All Clients", icon: Users },
  { href: "/admin/milestones", label: "Milestones", icon: Flag },
  { href: "/admin/team",       label: "Team",       icon: UsersRound },
];

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <AppShell.Navbar p="xs">
      {/* Logo — hidden on mobile since the top bar already shows it */}
      <Box px="xs" py="md" mb="xs" visibleFrom="sm">
        <Group gap="xs" align="center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon-tg-cow.svg" alt="T/G" width={22} height={22} />
          <div>
            <Text size="sm" fw={700} lh={1} c="gray.9">
              T<Text component="span" style={{ color: BRAND.orange }}>/</Text>G Portal
            </Text>
            <Text size="9px" fw={700} tt="uppercase" lts="0.15em" c="dimmed" mt={2}>
              Admin
            </Text>
          </div>
        </Group>
      </Box>

      <Divider mb="xs" visibleFrom="sm" />

      {/* Nav items */}
      <Stack gap={2} flex={1}>
        {navItems.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <NavLink
              key={href}
              component={Link}
              href={href}
              label={label}
              leftSection={<Icon size={16} strokeWidth={active ? 2.5 : 1.75} />}
              active={active}
              color="blue"
              onClick={onNavigate}
              styles={{
                root: active
                  ? { boxShadow: "inset 3px 0 0 var(--mantine-color-blue-6)" }
                  : undefined,
              }}
            />
          );
        })}
      </Stack>

      {/* Profile + Sign out */}
      <Divider mt="xs" mb="xs" />
      <NavLink
        component={Link}
        href="/admin/profile"
        label="Profile"
        leftSection={<UserCircle size={16} strokeWidth={pathname === "/admin/profile" ? 2.5 : 1.75} />}
        active={pathname === "/admin/profile"}
        color="blue"
        onClick={onNavigate}
        styles={{
          root: pathname === "/admin/profile"
            ? { boxShadow: "inset 3px 0 0 var(--mantine-color-blue-6)" }
            : undefined,
        }}
      />
      <UnstyledButton
        px="sm"
        py="xs"
        w="100%"
        onClick={() => signOut({ callbackUrl: "/login" })}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontSize: 14,
          fontWeight: 500,
          color: "var(--mantine-color-gray-6)",
          borderRadius: 4,
          transition: "background 0.15s, color 0.15s",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.background = "var(--mantine-color-gray-0)";
          (e.currentTarget as HTMLElement).style.color = "var(--mantine-color-gray-9)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.background = "transparent";
          (e.currentTarget as HTMLElement).style.color = "var(--mantine-color-gray-6)";
        }}
      >
        <LogOut size={15} strokeWidth={1.75} />
        Sign out
      </UnstyledButton>
    </AppShell.Navbar>
  );
}

// ── Mobile hamburger toggle (passed down from layout) ─────────────────────────
export function MobileNavToggle({ opened, toggle }: { opened: boolean; toggle: () => void }) {
  return (
    <UnstyledButton
      onClick={toggle}
      aria-label={opened ? "Close navigation" : "Open navigation"}
      p="xs"
      style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      <svg
        width={20}
        height={20}
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
      >
        {opened ? (
          <>
            <line x1="4" y1="4" x2="16" y2="16" />
            <line x1="16" y1="4" x2="4" y2="16" />
          </>
        ) : (
          <>
            <line x1="3" y1="6" x2="17" y2="6" />
            <line x1="3" y1="10" x2="17" y2="10" />
            <line x1="3" y1="14" x2="17" y2="14" />
          </>
        )}
      </svg>
    </UnstyledButton>
  );
}
