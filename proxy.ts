import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isMaintenanceMode } from "@/lib/utils/maintenance";

const PUBLIC_PATHS = ["/login", "/setup", "/maintenance", "/api/setup", "/api/auth"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const maintenanceActive = isMaintenanceMode();

  // Check if it's a public path
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
  
  // If maintenance is active and NOT a public path, redirect to maintenance immediately
  if (maintenanceActive && !isPublic) {
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

  // Allow public paths during maintenance
  if (isPublic) {
    return NextResponse.next();
  }

  // Normal operation (no maintenance)
  // After setup completes, API sets a cookie "app_setup=done"
  const setupDone = req.cookies.get("app_setup")?.value === "done";
  if (!setupDone && pathname !== "/setup") {
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
