import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isMaintenanceMode } from "@/lib/utils/maintenance";
import { computeSetupRequired } from "@/lib/utils/setupRequired";

/** Reachable without auth while maintenance is on (admins can still sign in). */
const MAINTENANCE_PUBLIC = [
  "/login",
  "/setup",
  "/maintenance",
  "/api/setup",
  "/api/auth",
  "/",
  "/cart",
  "/checkout",
  "/product",
  "/marketplace",
  "/api/marketplace",
  "/account",
  "/api/account",
];

/** Reachable without session (setup wizard, auth, maintenance, public storefront). */
const UNAUTHENTICATED = [
  "/login",
  "/setup",
  "/maintenance",
  "/api/auth",
  "/api/setup",
  "/",
  "/cart",
  "/checkout",
  "/product",
  "/marketplace",
  "/api/marketplace",
  "/account",
  "/api/account",
];

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

  // Normal operation: DB is source of truth (not app_setup cookie) so reset DB still sends users to setup.
  // NextAuth client fetches JSON from /api/auth/* — never HTML-redirect those or SessionProvider throws ClientFetchError.
  const bypassSetupRedirect =
    pathname === "/setup" ||
    pathname.startsWith("/api/setup") ||
    matchesPrefixList(pathname, ["/api/auth"]);
  if (!bypassSetupRedirect) {
    let setupRequired = true;
    try {
      setupRequired = await computeSetupRequired();
    } catch (err) {
      console.error("[proxy] setup check failed", err);
    }
    if (setupRequired) {
      // JSON for fetch() callers — never follow a redirect to HTML (breaks res.json()).
      const setupApiOk =
        pathname.startsWith("/api/auth") || pathname.startsWith("/api/setup");
      if (pathname.startsWith("/api/") && !setupApiOk) {
        return NextResponse.json(
          { success: false, error: "Application setup is not complete." },
          { status: 503 }
        );
      }
      const res = NextResponse.redirect(new URL("/setup", req.url));
      if (req.cookies.get("app_setup")?.value === "done") {
        res.cookies.set("app_setup", "", {
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          maxAge: 0,
        });
      }
      return res;
    }
  }

  const session = await auth();

  if (!session && matchesPrefixList(pathname, UNAUTHENTICATED)) {
    return NextResponse.next();
  }

  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
