import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { loginSchema } from "@/lib/validations/auth.schema";
import { verifyCredentials } from "@/lib/services/auth.service";
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


export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await verifyCredentials(parsed.data.email, parsed.data.password);
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
        session.user.id = token.sub!;
        session.user.role = token.role as UserRole;
        session.user.branchIds = token.branchIds as string[];
        session.user.organizationId = (token.organizationId as string | null) ?? null;
        session.user.permissions = token.permissions as string[];
      }
      return session;
    },
  },
});
