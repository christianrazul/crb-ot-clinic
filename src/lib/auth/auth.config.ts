import type { NextAuthConfig } from "next-auth";
import { UserRole } from "@prisma/client";

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith("/dashboard") ||
        nextUrl.pathname.startsWith("/schedule") ||
        nextUrl.pathname.startsWith("/clients") ||
        nextUrl.pathname.startsWith("/sessions") ||
        nextUrl.pathname.startsWith("/payments") ||
        nextUrl.pathname.startsWith("/reports") ||
        nextUrl.pathname.startsWith("/my-schedule") ||
        nextUrl.pathname.startsWith("/admin");

      if (isOnDashboard) {
        if (isLoggedIn) return true;
        return false;
      } else if (isLoggedIn && nextUrl.pathname === "/login") {
        return Response.redirect(new URL("/dashboard", nextUrl));
      }
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.primaryClinicId = user.primaryClinicId;
      }
      return token;
    },
    session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
        session.user.primaryClinicId = token.primaryClinicId as string | null;
      }
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
