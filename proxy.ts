import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { Session } from "next-auth";
import { isMaintenanceMode } from "@/lib/utils/maintenance";
import { computeSetupRequired } from "@/lib/utils/setupRequired";
import { isCustomerOrPublicApi, isStaffBlockedRole } from "@/lib/utils/apiAccess";
import { proxyRateLimit } from "@/lib/utils/rateLimit";

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

function isAuthApiRoute(pathname: string) {
  return pathname === "/api/auth" || pathname.startsWith("/api/auth/");
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const rateLimited = proxyRateLimit(req);
  if (rateLimited) return rateLimited;

  // Auth.js client expects JSON from /api/auth/* — never run setup redirects or auth() here.
  if (isAuthApiRoute(pathname)) {
    return NextResponse.next();
  }

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
  const bypassSetupRedirect =
    pathname === "/setup" || pathname.startsWith("/api/setup");
  if (!bypassSetupRedirect) {
    let setupRequired = true;
    let setupCheckFailed = false;
    try {
      setupRequired = await Promise.race([
        computeSetupRequired(),
        new Promise<boolean>((_, reject) => {
          setTimeout(() => reject(new Error("Setup check timed out")), 8_000);
        }),
      ]);
    } catch (err) {
      setupCheckFailed = true;
      console.error("[proxy] setup check failed", err);
    }
    if (setupCheckFailed && matchesPrefixList(pathname, UNAUTHENTICATED)) {
      return NextResponse.next();
    }
    if (setupRequired) {
      if (pathname.startsWith("/api/") && !pathname.startsWith("/api/setup")) {
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

  let session: Session | null = null;
  try {
    session = await auth();
  } catch (err) {
    console.error("[proxy] auth() failed", err);
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { success: false, error: "Authentication service unavailable" },
        { status: 503 }
      );
    }
    if (matchesPrefixList(pathname, UNAUTHENTICATED)) {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (!session && matchesPrefixList(pathname, UNAUTHENTICATED)) {
    return NextResponse.next();
  }

  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (
    pathname.startsWith("/api/") &&
    !isCustomerOrPublicApi(pathname) &&
    isStaffBlockedRole(session.user.role)
  ) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
