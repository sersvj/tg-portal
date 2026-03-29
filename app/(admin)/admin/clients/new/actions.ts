"use server";

import { db } from "@/lib/db";
import { createServiceClient, LOGO_BUCKET } from "@/lib/supabase";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";

export async function createClient(formData: FormData) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") throw new Error("Unauthorized");

  const companyName = formData.get("companyName") as string;
  const industry = formData.get("industry") as string;
  const website = formData.get("website") as string;
  const primaryAdminId = formData.get("primaryAdminId") as string;
  const logoFile = formData.get("logo") as File | null;

  if (!companyName?.trim()) throw new Error("Company name is required");
  if (!primaryAdminId) throw new Error("Primary admin is required");

  // Upload logo if provided
  let logoUrl: string | null = null;
  if (logoFile && logoFile.size > 0) {
    const supabase = createServiceClient();
    const ext = logoFile.name.split(".").pop();
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const bytes = await logoFile.arrayBuffer();
    const { error } = await supabase.storage
      .from(LOGO_BUCKET)
      .upload(filename, bytes, { contentType: logoFile.type, upsert: false });

    if (error) throw new Error(`Logo upload failed: ${error.message}`);

    const { data: urlData } = supabase.storage.from(LOGO_BUCKET).getPublicUrl(filename);
    logoUrl = urlData.publicUrl;
  }

  // Parse contacts from JSON sent by client
  const contactsRaw = formData.get("contacts") as string;
  let contacts: { name: string; title: string; phone: string; email: string; isPrimary: boolean }[] = [];
  try { contacts = contactsRaw ? JSON.parse(contactsRaw) : []; } catch { /* ignore malformed input */ }

  const client = await db.client.create({
    data: {
      companyName: companyName.trim(),
      industry: industry?.trim() || null,
      website: website?.trim() || null,
      logoUrl,
      primaryAdminId,
      contacts: {
        create: contacts.map(
          (
            c: { name: string; title: string; phone: string; email: string; isPrimary: boolean },
            i: number
          ) => ({
            name: c.name,
            title: c.title || null,
            phone: c.phone || null,
            email: c.email,
            isPrimary: i === 0,
            order: i,
          })
        ),
      },
    },
  });

  await logActivity({
    actorType: "ADMIN",
    actorId: session.user.id,
    actorName: session.user.name ?? session.user.email ?? "",
    actorEmail: session.user.email ?? "",
    action: "CLIENT_CREATED",
    clientId: client.id,
    subject: { type: "CLIENT", id: client.id, name: client.companyName },
  });

  redirect(`/admin/clients/${client.id}`);
}
