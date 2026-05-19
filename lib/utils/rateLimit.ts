import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { errorResponse } from "@/lib/utils/apiResponse";

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitOptions {
  limit: number;
  windowMs: number;
}

export function getClientIp(req: NextRequest | Request): string {
  const forwarded =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip");
  return forwarded || "unknown";
}

/** Returns true when the request is within the limit. */
export function consumeRateLimit(key: string, opts: RateLimitOptions): boolean {
  const now = Date.now();
  let entry = buckets.get(key);
  if (!entry || now >= entry.resetAt) {
    entry = { count: 0, resetAt: now + opts.windowMs };
    buckets.set(key, entry);
  }
  entry.count += 1;
  return entry.count <= opts.limit;
}

export function rateLimitResponse(retryAfterSec = 60): NextResponse {
  return errorResponse("Too many requests. Please try again later.", 429);
}

/** Apply rate limit; returns a 429 response when exceeded, otherwise null. */
export function enforceRateLimit(
  req: NextRequest | Request,
  bucket: string,
  opts: RateLimitOptions
): NextResponse | null {
  const ip = getClientIp(req);
  const key = `${bucket}:${ip}`;
  if (consumeRateLimit(key, opts)) return null;
  return rateLimitResponse(Math.ceil(opts.windowMs / 1000));
}

/** Proxy-level buckets for auth, registration, and setup. */
export function proxyRateLimit(req: NextRequest): NextResponse | null {
  if (req.method !== "POST") return null;
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/api/auth")) {
    return enforceRateLimit(req, "auth", { limit: 20, windowMs: 60_000 });
  }
  if (pathname === "/api/account/register") {
    return enforceRateLimit(req, "register", { limit: 10, windowMs: 60_000 });
  }
  if (pathname === "/api/setup") {
    return enforceRateLimit(req, "setup", { limit: 5, windowMs: 3_600_000 });
  }
  return null;
}
