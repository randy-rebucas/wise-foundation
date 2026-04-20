import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connect";
import { AppSettings } from "@/lib/db/models/AppSettings";
import { User } from "@/lib/db/models/User";
import bcrypt from "bcryptjs";
import { z } from "zod";

export async function GET(req: Request) {
  await connectDB();
  const settings = await AppSettings.findOne().lean();
  const setupRequired = !settings?.setupCompleted;

  const res = NextResponse.json({ setupRequired });

  // Sync the cookie if setup is already done (e.g. cookie was cleared)
  if (!setupRequired) {
    const existing = req.headers.get("cookie") ?? "";
    if (!existing.includes("app_setup=done")) {
      res.cookies.set("app_setup", "done", {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
      });
    }
  }

  return res;
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
  await connectDB();

  const body = await req.json();
  const parsed = setupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 422 });
  }

  const { appName, currency, timezone, adminName, adminEmail, adminPassword } = parsed.data;

  // Atomically claim setup using rawResult to distinguish "upsert created" from "filter not matched".
  // If setupCompleted is already true, the filter won't match → lastErrorObject has neither
  // updatedExisting nor upserted, meaning another request already completed setup.
  const rawResult = await AppSettings.findOneAndUpdate(
    { setupCompleted: { $ne: true } },
    { $set: { appName, currency, timezone, setupCompleted: true } },
    { upsert: true, new: false, rawResult: true }
  );

  const claimed = rawResult.lastErrorObject?.updatedExisting || rawResult.lastErrorObject?.upserted;
  if (!claimed) {
    return NextResponse.json({ success: false, error: "Setup already completed" }, { status: 400 });
  }

  const existingAdmin = await User.findOne({ role: "ADMIN", deletedAt: null }).lean();
  if (existingAdmin) {
    return NextResponse.json({ success: false, error: "An admin user already exists" }, { status: 400 });
  }

  const emailTaken = await User.findOne({ email: adminEmail.toLowerCase() }).lean();
  if (emailTaken) {
    return NextResponse.json({ success: false, error: "Email already in use" }, { status: 400 });
  }

  const hashed = await bcrypt.hash(adminPassword, 12);

  await User.create({
    name: adminName,
    email: adminEmail.toLowerCase(),
    password: hashed,
    role: "ADMIN",
    permissions: [],
    branchIds: [],
    isActive: true,
  });

  const response = NextResponse.json({ success: true });
  // Set a long-lived cookie so middleware knows setup is done without a DB call
  response.cookies.set("app_setup", "done", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });
  return response;
}
