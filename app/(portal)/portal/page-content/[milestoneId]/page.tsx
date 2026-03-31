import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { cookies } from "next/headers";
import { Stack, Box, Text, Group, Badge, Alert } from "@mantine/core";
import { LinkAnchor } from "@/components/ui/link-components";
import { ArrowLeft, CheckCircle } from "lucide-react";
import { MilestoneTypeBadge, MilestoneStatusBadge } from "@/components/ui/status-badge";
import { PageContentManager } from "./page-content-manager";

async function getMilestone(milestoneId: string, userId: string) {
  return db.clientMilestone.findFirst({
    where: {
      id: milestoneId,
      client: { clientUsers: { some: { userId } } },
    },
    include: {
      milestoneDefinition: { select: { name: true, description: true, type: true } },
      pageNodes: {
        where: { parentId: null },
        orderBy: { order: "asc" },
        include: {
          fields: { orderBy: { order: "asc" } },
          answers: true,
          children: {
            orderBy: { order: "asc" },
            include: {
              fields: { orderBy: { order: "asc" } },
              answers: true,
            },
          },
        },
      },
    },
  });
}

async function getMilestoneForPreview(milestoneId: string) {
  return db.clientMilestone.findUnique({
    where: { id: milestoneId },
    include: {
      milestoneDefinition: { select: { name: true, description: true, type: true } },
      pageNodes: {
        where: { parentId: null },
        orderBy: { order: "asc" },
        include: {
          fields: { orderBy: { order: "asc" } },
          answers: true,
          children: {
            orderBy: { order: "asc" },
            include: {
              fields: { orderBy: { order: "asc" } },
              answers: true,
            },
          },
        },
      },
    },
  });
}

export default async function PageContentMilestonePage({
  params,
}: {
  params: Promise<{ milestoneId: string }>;
}) {
  const { milestoneId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const cookieStore = await cookies();
  const previewClientId = cookieStore.get("tg-portal-preview")?.value;
  const isPreview = !!previewClientId && session.user.role === "ADMIN";

  const milestone = isPreview
    ? await getMilestoneForPreview(milestoneId)
    : await getMilestone(milestoneId, session.user.id);

  if (!milestone) notFound();
  if (milestone.milestoneDefinition.type !== "page_content") {
    redirect(`/portal/upload/${milestoneId}`);
  }

  const { milestoneDefinition: def, status } = milestone;
  const isCompleted = status === "COMPLETED";

  // Normalize: Prisma children don't include their own children (max 2 levels)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pageNodes: any[] = milestone.pageNodes.map((n) => ({
    ...n,
    children: n.children.map((c: typeof n.children[0]) => ({ ...c, children: [] })),
  }));

  // Flatten pages for the completed summary count
  const allPages = pageNodes.flatMap((n) => [n, ...n.children]).filter((n) => n.type === "PAGE");

  return (
    <Box maw={1200} mx="auto" py={{ base: "xl", sm: 56 }} px="md">
      <Stack gap="lg">
        {/* Back */}
        <Box>
          <LinkAnchor
            href="/portal"
            size="xs"
            c="gray.5"
            style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
          >
            <ArrowLeft size={11} /> Back to portal
          </LinkAnchor>
        </Box>

        {/* Title + badges */}
        <Group justify="space-between" align="flex-start">
          <Box>
            <Text fw={800} fz={28} c="gray.9" style={{ letterSpacing: "-0.02em", lineHeight: 1.1 }}>
              {def.name}
            </Text>
            {def.description && (
              <Text size="sm" c="gray.5" mt={6}>{def.description}</Text>
            )}
          </Box>
          <Group gap="xs">
            <MilestoneTypeBadge type={def.type} />
            <MilestoneStatusBadge status={status} />
          </Group>
        </Group>

        {/* Instructions */}
        {milestone.instructions && (
          <Alert color="blue" variant="light" title="Instructions">
            <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>{milestone.instructions}</Text>
          </Alert>
        )}

        {/* Preview notice */}
        {isPreview && (
          <Alert color="yellow" variant="light">
            <Text size="sm">Page content submission is disabled in preview mode.</Text>
          </Alert>
        )}

        {/* Completed — read-only summary */}
        {isCompleted ? (
          <Stack gap="md">
            <Group gap="xs">
              <CheckCircle size={14} style={{ color: "var(--mantine-color-green-6)" }} />
              <Text size="sm" fw={600} c="green.7">
                Submitted — {allPages.length} page{allPages.length !== 1 ? "s" : ""} of content
              </Text>
            </Group>
            <Box
              p="md"
              style={{
                border: "1px solid var(--mantine-color-gray-2)",
                borderRadius: 4,
                background: "white",
              }}
            >
              <Text size="sm" c="gray.6">
                Your page content has been submitted for review. Your account manager will be in touch if anything is needed.
              </Text>
            </Box>
          </Stack>
        ) : isPreview ? (
          // Preview — show page list read-only
          <Stack gap="xs">
            {pageNodes.length === 0 ? (
              <Text size="sm" c="gray.5">No pages have been configured for this milestone yet.</Text>
            ) : (
              allPages.map((p) => (
                <Box
                  key={p.id}
                  px="md"
                  py="sm"
                  style={{
                    border: "1px solid var(--mantine-color-gray-2)",
                    borderRadius: 4,
                    background: "white",
                  }}
                >
                  <Group gap="xs">
                    <Text size="sm" c="gray.8">{p.title}</Text>
                    {p.isOptional && <Badge color="gray" variant="light" size="xs">Optional</Badge>}
                  </Group>
                </Box>
              ))
            )}
          </Stack>
        ) : pageNodes.length === 0 ? (
          <Box
            p="md"
            style={{
              border: "1px solid var(--mantine-color-gray-2)",
              borderRadius: 4,
              background: "white",
            }}
          >
            <Text size="sm" c="gray.5">
              No pages have been configured yet. Your account manager will set these up before you can submit.
            </Text>
          </Box>
        ) : (
          // Active — editable
          <PageContentManager
            milestoneId={milestoneId}
            initialNodes={pageNodes}
          />
        )}
      </Stack>
    </Box>
  );
}
