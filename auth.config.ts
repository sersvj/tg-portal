import type { NextAuthConfig } from "next-auth";

// Edge-safe config — no Prisma, no bcrypt. Used by middleware only.
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const { nextUrl } = request;
      const isLoggedIn = !!auth?.user;
      const isAdmin = auth?.user?.role === "ADMIN";
      const path = nextUrl.pathname;

      const isAuthPage = path.startsWith("/login") || path.startsWith("/invite");
      const isAdminRoute = path.startsWith("/admin");
      const isPortalRoute = path.startsWith("/portal");

      if (isAuthPage) {
        if (isLoggedIn) {
          return Response.redirect(new URL(isAdmin ? "/admin" : "/portal", nextUrl));
        }
        return true;
      }

      if (!isLoggedIn) return false; // redirects to /login

      if (isAdminRoute && !isAdmin) {
        return Response.redirect(new URL("/portal", nextUrl));
      }

      const isPortalPreview = !!request.cookies.get("tg-portal-preview");
      if (isPortalRoute && isAdmin && !isPortalPreview) {
        return Response.redirect(new URL("/admin", nextUrl));
      }

      return true;
    },
  },
} satisfies NextAuthConfig;
