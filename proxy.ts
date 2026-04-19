import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/setup", "/api/setup", "/api/auth"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
  if (isPublic) return NextResponse.next();

  // After setup completes, API sets a cookie "app_setup=done"
  // Proxy reads the cookie to avoid a DB round-trip on every request
  const setupDone = req.cookies.get("app_setup")?.value === "done";
  if (!setupDone) {
    return NextResponse.redirect(new URL("/setup", req.url));
  }

  const session = await auth();
  if (!session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
