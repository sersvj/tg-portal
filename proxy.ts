import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default async function proxy(req: NextRequest) {
  const session = await auth();
  const { pathname } = req.nextUrl;

  const isLoggedIn = !!session;
  const isAdmin = session?.user?.role === "ADMIN";

  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/invite") || pathname.startsWith("/forgot-password") || pathname.startsWith("/reset-password");
  const isAdminRoute = pathname.startsWith("/admin");
  const isPortalRoute = pathname.startsWith("/portal");

  if (isAuthPage) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL(isAdmin ? "/admin" : "/portal", req.url));
    }
    return NextResponse.next();
  }

  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (isAdminRoute && !isAdmin) {
    return NextResponse.redirect(new URL("/portal", req.url));
  }

  const isPortalPreview = !!req.cookies.get("tg-portal-preview");
  if (isPortalRoute && isAdmin && !isPortalPreview) {
    return NextResponse.redirect(new URL("/admin", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|icon-tg-cow.svg).*)"],
};
