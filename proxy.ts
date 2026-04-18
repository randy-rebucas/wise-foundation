import { auth } from "@/auth";
import { NextResponse } from "next/server";

const BYPASS_PATHS = [
  "/_next",
  "/favicon.ico",
  "/api",
  "/login",
];

export default auth((req) => {
  const { pathname } = req.nextUrl;

  const isBypass = BYPASS_PATHS.some((p) => pathname.startsWith(p));
  if (isBypass) return NextResponse.next();

  if (!req.auth) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
