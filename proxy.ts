import { auth } from "@/auth";
import { NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/register", "/api/auth", "/api"];

// Paths that are valid without a slug prefix (auth pages, API, static)
const BYPASS_PATHS = [
  "/_next",
  "/favicon.ico",
  "/api",
  "/login",
  "/register",
];

export default auth((req) => {
  const { pathname } = req.nextUrl;

  const isBypass = BYPASS_PATHS.some((p) => pathname.startsWith(p));
  if (isBypass) return NextResponse.next();

  // Not logged in → send to login
  if (!req.auth) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Root path → handled by app/page.tsx (redirects to /{slug}/dashboard)
  if (pathname === "/") return NextResponse.next();

  // Slug segment is the first path segment: /[slug]/...
  const segments = pathname.split("/").filter(Boolean);
  const slug = segments[0];

  // If navigating to a slug route that belongs to a different tenant,
  // the [slug] layout.tsx handles the redirect enforcement.
  // Here we just block SUPER_ADMIN-only admin/tenants for non-super-admins.
  if (
    segments[1] === "admin" &&
    segments[2] === "tenants" &&
    req.auth.user.role !== "SUPER_ADMIN"
  ) {
    return NextResponse.redirect(new URL(`/${slug}/dashboard`, req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
