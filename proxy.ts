import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isMaintenanceMode } from "@/lib/utils/maintenance";

/** Reachable without auth while maintenance is on (admins can still sign in). */
const MAINTENANCE_PUBLIC = ["/login", "/setup", "/maintenance", "/api/setup", "/api/auth"];

/** Reachable without session after setup cookie is set. */
const UNAUTHENTICATED = ["/login", "/maintenance", "/api/auth"];

function matchesPrefixList(pathname: string, prefixes: string[]) {
  return prefixes.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const maintenanceActive = isMaintenanceMode();

  const isMaintenancePublic = matchesPrefixList(pathname, MAINTENANCE_PUBLIC);

  // If maintenance is active and NOT a public path, redirect to maintenance immediately
  if (maintenanceActive && !isMaintenancePublic) {
    // Block API calls with 503
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "System is under maintenance" },
        { status: 503 }
      );
    }

    // Redirect all pages to maintenance
    return NextResponse.redirect(new URL("/maintenance", req.url));
  }

  // During maintenance only: allow sign-in, setup, and auth API without further checks
  if (maintenanceActive && isMaintenancePublic) {
    return NextResponse.next();
  }

  // Normal operation (no maintenance). Fresh DB has no app_setup cookie — force /setup
  // before /login or any other route (previously /login was "public" and skipped this).
  const setupDone = req.cookies.get("app_setup")?.value === "done";
  const onSetupFlow = pathname === "/setup" || pathname.startsWith("/api/setup");
  if (!setupDone && !onSetupFlow) {
    return NextResponse.redirect(new URL("/setup", req.url));
  }

  const session = await auth();

  if (!session && matchesPrefixList(pathname, UNAUTHENTICATED)) {
    return NextResponse.next();
  }

  if (!session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
