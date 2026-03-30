import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cookies } from "next/headers";
import {
  Stack, Box, Group, Text, Progress, Grid, GridCol, Anchor,
} from "@mantine/core";
import { LinkBox } from "@/components/ui/link-components";
import { CheckCircle, Lock, ArrowRight, ClipboardList, PauseCircle } from "lucide-react";
import { MilestoneStatus } from "@prisma/client";
import { EmptyState } from "@/components/ui/empty-state";
import { BRAND } from "@/lib/theme";
import { ClientLinks } from "@/components/portal/client-links";

async function getPortalData(userId: string) {
  const clientUser = await db.clientUser.findFirst({
    where: { userId },
    include: {
      client: {
        include: {
          primaryAdmin: { select: { name: true, email: true } },
          milestones: {
            include: {
              milestoneDefinition: true,
              _count: { select: { uploadedFiles: true, staffProfiles: true } },
            },
            orderBy: { order: "asc" },
          },
          contacts: { select: { name: true, email: true, isPrimary: true } },
          links: { orderBy: { order: "asc" } },
        },
      },
    },
  });
  return clientUser?.client ?? null;
}

async function getPortalDataByClientId(clientId: string) {
  return db.client.findUnique({
    where: { id: clientId },
    include: {
      primaryAdmin: { select: { name: true, email: true } },
      milestones: {
        include: {
          milestoneDefinition: true,
          _count: { select: { uploadedFiles: true, staffProfiles: true } },
        },
        orderBy: { order: "asc" },
      },
      contacts: { select: { name: true, email: true, isPrimary: true } },
      links: { orderBy: { order: "asc" } },
    },
  });
}

type MilestoneRow = {
  id: string;
  status: MilestoneStatus;
  completedAt: Date | null;
  draftAnswers: unknown;
  milestoneDefinition: { name: string; description: string | null; type: string };
  _count: { uploadedFiles: number; staffProfiles: number };
};

function MilestoneItem({ milestone, index }: { milestone: MilestoneRow; index: number }) {
  const { status, milestoneDefinition: def, completedAt } = milestone;
  const isLocked    = status === "LOCKED";
  const isActive    = status === "ACTIVE";
  const isDone      = status === "COMPLETED";
  const fileCount   = milestone._count.uploadedFiles;
  const staffCount  = milestone._count.staffProfiles;
  const hasDraft    = def.type === "questionnaire" && milestone.draftAnswers !== null;

  const href = def.type === "questionnaire"
    ? `/portal/questionnaire/${milestone.id}`
    : def.type === "staff_profiles"
    ? `/portal/staff/${milestone.id}`
    : `/portal/upload/${milestone.id}`;

  const rowStyle = {
    borderLeft: `3px solid ${
      isActive ? BRAND.orange
      : isDone  ? "var(--mantine-color-green-4)"
      :           "var(--mantine-color-gray-2)"
    }`,
    borderTop: index > 0 ? "1px solid var(--mantine-color-gray-1)" : undefined,
    padding: "16px 20px",
    background: "white",
    display: "block",
    textDecoration: "none",
  };

  const content = (
    <Group justify="space-between" wrap="nowrap" gap="md">
      {/* Step number + info */}
      <Group gap="md" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
        <Text
          fw={700}
          fz={20}
          ff="monospace"
          c={isActive ? "orange.7" : isDone ? "gray.4" : "gray.3"}
          style={{ flexShrink: 0, lineHeight: 1 }}
        >
          {String(index + 1).padStart(2, "0")}
        </Text>
        <Box style={{ minWidth: 0 }}>
          <Text size="sm" fw={600} c={isDone ? "gray.5" : "gray.9"} truncate>
            {def.name}
          </Text>
          {def.description && (
            <Text size="xs" c="gray.5" truncate mt={2}>{def.description}</Text>
          )}
        </Box>
      </Group>

      {/* Right indicator */}
      <Box style={{ flexShrink: 0 }}>
        {isActive && (
          <Group gap={4}>
            <Text size="xs" fw={600} c="orange.7">
              {def.type === "staff_profiles" && staffCount > 0
                ? `${staffCount} added · Continue`
                : def.type !== "questionnaire" && fileCount > 0
                ? `${fileCount} file${fileCount !== 1 ? "s" : ""} · Continue`
                : hasDraft ? "Continue" : "Start"}
            </Text>
            <ArrowRight size={12} style={{ color: `var(--mantine-color-orange-7)` }} />
          </Group>
        )}
        {isDone && (
          <Group gap={4}>
            <CheckCircle size={12} style={{ color: "var(--mantine-color-green-6)" }} />
            <Text size="xs" fw={600} c="green.6">
              {completedAt
                ? `Submitted ${new Date(completedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                : "Submitted"}
            </Text>
          </Group>
        )}
        {isLocked && <Lock size={13} style={{ color: "var(--mantine-color-gray-3)" }} />}
      </Box>
    </Group>
  );

  return isActive ? (
    <LinkBox href={href} style={{ ...rowStyle, cursor: "pointer" }}>
      {content}
    </LinkBox>
  ) : (
    <Box style={{ ...rowStyle, cursor: "default" }}>
      {content}
    </Box>
  );
}

export const metadata: Metadata = { title: "Your Portal" };

export default async function PortalPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const cookieStore = await cookies();
  const previewClientId = cookieStore.get("tg-portal-preview")?.value;
  const isPreview = !!previewClientId && session?.user?.role === "ADMIN";

  const client = isPreview
    ? await getPortalDataByClientId(previewClientId!)
    : await getPortalData(session.user.id);

  if (!client) {
    return (
      <Box maw={640} mx="auto" py={80} px="md" style={{ textAlign: "center" }}>
        <Text size="sm" c="gray.5">Your portal is being set up. Check back soon.</Text>
      </Box>
    );
  }

  if (!client.isActive) {
    const admin = client.primaryAdmin;
    return (
      <Box maw={560} mx="auto" py={80} px="md" style={{ textAlign: "center" }}>
        <PauseCircle size={32} style={{ color: "var(--mantine-color-yellow-6)", marginBottom: 16 }} />
        <Text fw={700} size="lg" c="gray.9" mb={8}>This portal is inactive.</Text>
        <Text size="sm" c="gray.5" style={{ lineHeight: 1.7 }} mb="xl">
          Your portal is not currently active. Please contact your account manager with any questions.
        </Text>
        {admin && (
          <Box
            p="md"
            style={{
              border: "1px solid var(--mantine-color-gray-2)",
              borderRadius: 4,
              background: "white",
              display: "inline-block",
              textAlign: "center",
              minWidth: 220,
            }}
          >
            <Text size="sm" fw={600} c="gray.9">{admin.name ?? "Your account manager"}</Text>
            <Anchor href={`mailto:${admin.email}`} size="sm" c="blue.6" mt={2} style={{ display: "block" }}>
              {admin.email}
            </Anchor>
          </Box>
        )}
      </Box>
    );
  }

  const milestones = client.milestones;
  const total   = milestones.length;
  const done    = milestones.filter((m) => m.status === "COMPLETED").length;
  const allDone = total > 0 && done === total;
  const pct     = total > 0 ? Math.round((done / total) * 100) : 0;

  const matchedContact = isPreview
    ? (client.contacts.find((c) => c.isPrimary) ?? client.contacts[0])
    : (() => {
        const userEmail = session.user.email ?? "";
        return client.contacts.find((c) => c.email.toLowerCase() === userEmail.toLowerCase())
          ?? client.contacts.find((c) => c.isPrimary)
          ?? client.contacts[0];
      })();
  const firstName = matchedContact?.name.split(" ")[0] ?? (isPreview ? null : (session.user.name?.split(" ")[0] ?? null));

  const links = client.links;
  const hasLinks = links.length > 0;

  return (
    <Box maw={hasLinks ? 1100 : 700} mx="auto" py={{ base: "xl", sm: 64 }} px="md">
      <Grid gutter={{ base: "xl", sm: 56 }} align="flex-start">

        {/* Left: hero + milestones */}
        <GridCol span={{ base: 12, sm: hasLinks ? 7 : 12 }}>
          <Stack gap="xl">

            {/* Hero */}
            <Box>
              <Text
                size="xs"
                fw={700}
                tt="uppercase"
                lts="0.2em"
                mb="md"
                style={{ color: BRAND.orange }}
              >
                {firstName ? `Welcome, ${firstName}` : "Welcome"}
              </Text>

              <Group justify="space-between" align="flex-start" wrap="nowrap" mb="lg">
                <Text
                  fw={900}
                  fz={{ base: 36, sm: 48 }}
                  c="gray.9"
                  style={{ letterSpacing: "-0.03em", lineHeight: 1.05 }}
                >
                  {allDone ? "You're all set." : "Let's get you\nonboarded."}
                </Text>

                {total > 0 && (
                  <Box style={{ textAlign: "right", flexShrink: 0 }}>
                    <Text fw={900} fz={{ base: 40, sm: 64 }} c="blue.6" ff="monospace" style={{ lineHeight: 1 }}>
                      {String(done).padStart(2, "0")}
                    </Text>
                    <Text size="sm" c="gray.5" mt={4}>of {total} complete</Text>
                  </Box>
                )}
              </Group>

              {total > 0 && (
                <Box>
                  <Progress
                    value={pct}
                    color="blue"
                    size="xs"
                    style={{ borderRadius: 2 }}
                  />
                  <Group justify="space-between" mt={6}>
                    <Text size="xs" fw={600} tt="uppercase" lts="0.1em" c="gray.4">Progress</Text>
                    <Text size="xs" fw={700} c="blue.6">{pct}%</Text>
                  </Group>
                </Box>
              )}
            </Box>

            {/* Milestone list */}
            {milestones.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title="Nothing here yet"
                description="Your team is setting up your milestones. Check back soon."
              />
            ) : (
              <Box
                style={{
                  border: "1px solid var(--mantine-color-gray-2)",
                  borderRadius: 4,
                  overflow: "hidden",
                }}
              >
                {milestones.map((milestone, i) => (
                  <MilestoneItem key={milestone.id} milestone={milestone} index={i} />
                ))}
              </Box>
            )}

            {/* All done banner */}
            {allDone && (
              <Box
                p="xl"
                style={{
                  border: "1px solid var(--mantine-color-green-3)",
                  borderRadius: 4,
                  background: "var(--mantine-color-green-0)",
                  textAlign: "center",
                }}
              >
                <CheckCircle size={18} style={{ color: "var(--mantine-color-green-6)", margin: "0 auto 12px" }} />
                <Text fw={700} c="gray.9" mb={4}>All done — great work.</Text>
                <Text size="sm" c="gray.5" maw={280} mx="auto" style={{ lineHeight: 1.6 }}>
                  We have everything we need. Our team will be in touch with next steps.
                </Text>
              </Box>
            )}

          </Stack>
        </GridCol>

        {/* Right: links */}
        {hasLinks && (
          <GridCol span={{ base: 12, sm: 5 }}>
            <ClientLinks links={links} />
          </GridCol>
        )}

      </Grid>
    </Box>
  );
}
