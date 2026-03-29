import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Stack } from "@mantine/core";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { ProfileForm, ChangePasswordForm } from "./profile-forms";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/login");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true },
  });
  if (!user) redirect("/login");

  return (
    <Stack p={{ base: "md", sm: "xl" }} gap="xl" maw={760}>
      <PageHeader title="Profile" subtitle="Manage your account details and password." />

      <SectionCard title="Account details" description="Update your name and email address.">
        <ProfileForm name={user.name ?? ""} email={user.email} />
      </SectionCard>

      <SectionCard title="Change password" description="Must be at least 8 characters.">
        <ChangePasswordForm />
      </SectionCard>
    </Stack>
  );
}
