import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { cookies } from "next/headers";
import { AppShell, AppShellHeader, AppShellFooter, AppShellMain, Group, Text, Button, Box } from "@mantine/core";
import { LogOut, UserCircle } from "lucide-react";
import { LinkAnchor } from "@/components/ui/link-components";
import { signOut } from "@/lib/auth";
import Image from "next/image";
import { BRAND } from "@/lib/theme";
import { exitPortalPreview } from "./portal/preview-actions";

async function getClientForUser(userId: string) {
  const clientUser = await db.clientUser.findFirst({
    where: { userId },
    include: { client: { select: { companyName: true, logoUrl: true } } },
  });
  return clientUser?.client ?? null;
}

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const cookieStore = await cookies();
  const previewClientId = cookieStore.get("tg-portal-preview")?.value;
  const isPreview = !!previewClientId && session?.user?.role === "ADMIN";

  if (!session || (session.user.role !== "CLIENT" && !isPreview)) redirect("/login");

  const client = isPreview
    ? await db.client.findUnique({ where: { id: previewClientId }, select: { companyName: true, logoUrl: true } })
    : await getClientForUser(session.user.id);

  return (
    <AppShell header={{ height: 56 }} footer={isPreview ? { height: 48 } : undefined} padding={0}>
      <AppShellHeader>
        <Group h="100%" px={{ base: "md", sm: "xl" }} justify="space-between">
          {/* Brand */}
          <Group gap="sm">
            {client?.logoUrl ? (
              <Box
                w={28}
                h={28}
                style={{
                  borderRadius: 4,
                  overflow: "hidden",
                  border: "1px solid var(--mantine-color-gray-2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Image
                  src={client.logoUrl}
                  alt={client.companyName}
                  width={28}
                  height={28}
                  style={{ objectFit: "contain" }}
                />
              </Box>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src="/icon-tg-cow.svg" alt="T/G" width={22} height={22} />
            )}
            <div>
              <Text size="sm" fw={700} lh={1} c="gray.9">
                {client?.companyName ?? "Client Portal"}
              </Text>
              <Text
                size="9px"
                fw={700}
                tt="uppercase"
                lts="0.15em"
                lh={1}
                mt={3}
                c="gray.6"
              >
                Powered by Tayloe<Text component="span" style={{ color: BRAND.orange }}>/</Text>Gray
              </Text>
            </div>
          </Group>

          {/* Account + Sign out */}
          <Group gap="xs">
            {!isPreview && (
              <LinkAnchor
                href="/portal/account"
                size="xs"
                c="gray.5"
                style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
              >
                <UserCircle size={13} />
                Account
              </LinkAnchor>
            )}
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <Button
                type="submit"
                variant="subtle"
                color="gray"
                size="xs"
                leftSection={<LogOut size={13} />}
              >
                Sign out
              </Button>
            </form>
          </Group>
        </Group>
      </AppShellHeader>

      {isPreview && (
        <AppShellFooter
          style={{
            background: "var(--mantine-color-yellow-1)",
            borderTop: "2px solid var(--mantine-color-yellow-4)",
            padding: "0 20px",
            display: "flex",
            alignItems: "center",
          }}
        >
          <Group justify="space-between" align="center" w="100%">
            <Group gap="xs">
              <Text size="xs" fw={700} tt="uppercase" lts="0.1em" c="yellow.8">
                Preview Mode
              </Text>
              <Text size="xs" c="yellow.7">
                — Viewing {client?.companyName ?? "client"} portal as admin
              </Text>
            </Group>
            <form action={exitPortalPreview}>
              <Button type="submit" variant="light" color="yellow" size="xs" style={{ cursor: "pointer" }}>
                Exit Preview
              </Button>
            </form>
          </Group>
        </AppShellFooter>
      )}

      <AppShellMain>
        {children}
      </AppShellMain>
    </AppShell>
  );
}
