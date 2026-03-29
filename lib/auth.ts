import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { authConfig } from "@/auth.config";
import { logActivity, resolveClientActorName } from "@/lib/activity-log";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await db.user.findUnique({
          where: { email: parsed.data.email },
        });

        if (!user || !user.passwordHash) return null;

        // Enforce: admin accounts must be @tayloegray.com
        if (user.role === "ADMIN" && !user.email.endsWith("@tayloegray.com")) return null;

        const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!valid) return null;

        return user;
      },
    }),
  ],
  events: {
    async signIn({ user }) {
      const u = user as { id: string; role?: string; name?: string | null; email?: string | null };
      if (u.role === "CLIENT") {
        const clientUser = await db.clientUser.findFirst({
          where: { userId: u.id },
          include: { client: { select: { id: true, companyName: true } } },
        });
        const actorEmail = u.email ?? "";
        const actorName = await resolveClientActorName(
          actorEmail,
          clientUser?.client.id,
          u.name ?? (actorEmail || u.id),
        );
        await logActivity({
          actorType: "CLIENT",
          actorId: u.id,
          actorName,
          actorEmail,
          action: "CLIENT_LOGIN",
          clientId: clientUser?.client.id,
          subject: clientUser
            ? { type: "CLIENT", id: clientUser.client.id, name: clientUser.client.companyName }
            : undefined,
        });
      }
    },
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.role = token.role as string;
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});
