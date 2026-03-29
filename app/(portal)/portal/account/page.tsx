import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Stack, Text } from "@mantine/core";
import { LinkAnchor } from "@/components/ui/link-components";
import { SectionCard } from "@/components/ui/section-card";
import { ArrowLeft } from "lucide-react";
import { ChangePasswordForm } from "./change-password-form";

export const metadata: Metadata = { title: "Account" };

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <Stack maw={560} mx="auto" py={{ base: "xl", sm: 56 }} px="md" gap="lg">
      <LinkAnchor
        href="/portal"
        size="xs"
        c="gray.5"
        style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
      >
        <ArrowLeft size={11} /> Back to portal
      </LinkAnchor>

      <div>
        <Text fw={700} fz={24} c="gray.9" style={{ letterSpacing: "-0.02em" }}>Account</Text>
        <Text size="sm" c="gray.5" mt={4}>Manage your password.</Text>
      </div>

      <SectionCard title="Change password" description="Must be at least 8 characters.">
        <ChangePasswordForm />
      </SectionCard>
    </Stack>
  );
}
