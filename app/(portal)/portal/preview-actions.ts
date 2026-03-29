"use server";
import { auth } from "@/lib/auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function enterPortalPreview(clientId: string) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") throw new Error("Unauthorized");
  const cookieStore = await cookies();
  cookieStore.set("tg-portal-preview", clientId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60, // 1 hour
  });
  redirect("/portal");
}

export async function exitPortalPreview() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") return;
  const cookieStore = await cookies();
  const clientId = cookieStore.get("tg-portal-preview")?.value;
  cookieStore.delete("tg-portal-preview");
  redirect(clientId ? `/admin/clients/${clientId}` : "/admin/clients");
}
