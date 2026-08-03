import { NextResponse } from "next/server";
import logger from "@/lib/logger";
import { runInitialSetup } from "@/lib/services/appSettings.service";
import { computeSetupRequired } from "@/lib/utils/setupRequired";
import {
  invalidateSetupRequiredCache,
  setCachedSetupRequired,
} from "@/lib/utils/setupRequiredCache";
import bcrypt from "bcryptjs";
import { z } from "zod";

const APP_SETUP_COOKIE = "app_setup";

export async function GET(req: Request) {
  try {
    const setupRequired = await computeSetupRequired();
    setCachedSetupRequired(setupRequired);
    const res = NextResponse.json({ setupRequired });
    const existing = req.headers.get("cookie") ?? "";

    if (!setupRequired && !existing.includes(`${APP_SETUP_COOKIE}=done`)) {
      res.cookies.set(APP_SETUP_COOKIE, "done", {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
      });
    }

    if (setupRequired && existing.includes(`${APP_SETUP_COOKIE}=done`)) {
      res.cookies.set(APP_SETUP_COOKIE, "", {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 0,
      });
    }

    return res;
  } catch (err) {
    logger.error({ err }, "[setup GET]");
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unable to verify setup status" },
      { status: 503 }
    );
  }
}

const setupSchema = z.object({
  appName: z.string().min(1).max(100),
  currency: z.string().min(1).max(10).default("PHP"),
  timezone: z.string().min(1).default("Asia/Manila"),
  adminName: z.string().min(2).max(100),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(8),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = setupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 422 });
    }

    const { appName, currency, timezone, adminName, adminEmail, adminPassword } = parsed.data;
    const adminPasswordHash = await bcrypt.hash(adminPassword, 12);

    await runInitialSetup({ appName, currency, timezone, adminName, adminEmail, adminPasswordHash });

    setCachedSetupRequired(false);
    invalidateSetupRequiredCache();

    const response = NextResponse.json({ success: true });
    response.cookies.set(APP_SETUP_COOKIE, "done", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365, // 1 year
    });
    return response;
  } catch (err) {
    logger.error({ err }, "[setup POST]");
    const knownErrors = ["An admin user already exists", "Email already in use", "Setup already completed"];
    const message = err instanceof Error ? err.message : "Setup failed unexpectedly";
    return NextResponse.json(
      { success: false, error: message },
      { status: err instanceof Error && knownErrors.includes(err.message) ? 400 : 500 }
    );
  }
}
