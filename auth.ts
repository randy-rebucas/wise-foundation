import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { loginSchema } from "@/lib/validations/auth.schema";
import { verifyCredentials } from "@/lib/services/auth.service";
import { effectivePermissions } from "@/lib/permissions";
import type { UserRole } from "@/types";

declare module "next-auth" {
  interface User {
    role: UserRole;
    branchIds: string[];
    organizationId?: string | null;
    permissions: string[];
  }
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: UserRole;
      branchIds: string[];
      organizationId?: string | null;
      permissions: string[];
      image?: string;
    };
  }
}


const authSecret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;

if (!authSecret && process.env.NODE_ENV === "production") {
  throw new Error(
    "AUTH_SECRET (or NEXTAUTH_SECRET) is required. Generate one with: openssl rand -hex 32"
  );
}

if (!authSecret && process.env.NODE_ENV === "development") {
  console.warn(
    "[auth] AUTH_SECRET / NEXTAUTH_SECRET is not set — session API may return errors. Add it to .env.local"
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: authSecret,
  trustHost: true,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        audience: { label: "Audience", type: "text" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse({
          email: credentials?.email,
          password: credentials?.password,
          audience: credentials?.audience === "customer" ? "customer" : "staff",
        });
        if (!parsed.success) return null;

        const user = await verifyCredentials(parsed.data.email, parsed.data.password, {
          audience: parsed.data.audience,
        });
        return user;
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.role = user.role;
        token.branchIds = user.branchIds;
        token.organizationId = user.organizationId ?? null;
        token.permissions = user.permissions;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        const role = token.role as UserRole;
        session.user.id = token.sub!;
        session.user.role = role;
        session.user.branchIds = token.branchIds as string[];
        session.user.organizationId = (token.organizationId as string | null) ?? null;
        session.user.permissions = effectivePermissions({
          role,
          permissions: (token.permissions as string[]) ?? [],
        });
      }
      return session;
    },
  },
});
