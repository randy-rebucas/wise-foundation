import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db/connect";
import { AppSettings } from "@/lib/db/models/AppSettings";
import { User } from "@/lib/db/models/User";
import { computeSetupRequired } from "@/lib/utils/setupRequired";
import bcrypt from "bcryptjs";
import { z } from "zod";

const APP_SETUP_COOKIE = "app_setup";

export async function GET(req: Request) {
  try {
    const setupRequired = await computeSetupRequired();
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
    console.error("[setup GET]", err);
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

const DEFAULT_APP_TAGLINE = "Women in the Service";
const DEFAULT_MEMBER_DISCOUNT = 10;
const DEFAULT_LOW_STOCK = 10;

export async function POST(req: Request) {
  let mongoSession: mongoose.ClientSession | null = null;
  try {
    await connectDB();

    const body = await req.json();
    const parsed = setupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 422 });
    }

    const { appName, currency, timezone, adminName, adminEmail, adminPassword } = parsed.data;
    const hashed = await bcrypt.hash(adminPassword, 12);

    mongoSession = await mongoose.startSession();
    mongoSession.startTransaction();

    const existingAdmin = await User.findOne({ role: "ADMIN", deletedAt: null })
      .session(mongoSession)
      .lean();
    if (existingAdmin) {
      await mongoSession.abortTransaction();
      return NextResponse.json({ success: false, error: "An admin user already exists" }, { status: 400 });
    }

    const emailTaken = await User.findOne({ email: adminEmail.toLowerCase() })
      .session(mongoSession)
      .lean();
    if (emailTaken) {
      await mongoSession.abortTransaction();
      return NextResponse.json({ success: false, error: "Email already in use" }, { status: 400 });
    }

    const appSettingsPayload = {
      appName,
      currency,
      timezone,
      setupCompleted: true,
      appTagline: DEFAULT_APP_TAGLINE,
      memberDefaultDiscountPercent: DEFAULT_MEMBER_DISCOUNT,
      defaultLowStockThreshold: DEFAULT_LOW_STOCK,
      receiptFooter: "",
    };

    // Persist settings without rawResult / lastErrorObject (Mongoose 9 can return null there).
    // Avoid upsert on `{ setupCompleted: { $ne: true } }` alone — if a completed row exists, that upsert can insert a second document.
    const settingsRow = await AppSettings.findOne({}).session(mongoSession).sort({ _id: 1 });

    if (settingsRow?.setupCompleted === true) {
      await mongoSession.abortTransaction();
      return NextResponse.json({ success: false, error: "Setup already completed" }, { status: 400 });
    }

    if (settingsRow) {
      const updated = await AppSettings.findOneAndUpdate(
        { _id: settingsRow._id, setupCompleted: { $ne: true } },
        { $set: appSettingsPayload },
        { new: true, session: mongoSession }
      );
      if (!updated) {
        await mongoSession.abortTransaction();
        return NextResponse.json({ success: false, error: "Setup already completed" }, { status: 400 });
      }
    } else {
      await AppSettings.create([appSettingsPayload], { session: mongoSession });
    }

    await User.create(
      [
        {
          name: adminName,
          email: adminEmail.toLowerCase(),
          password: hashed,
          role: "ADMIN",
          permissions: [],
          branchIds: [],
          isActive: true,
        },
      ],
      { session: mongoSession }
    );

    await mongoSession.commitTransaction();

    const response = NextResponse.json({ success: true });
    response.cookies.set(APP_SETUP_COOKIE, "done", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365, // 1 year
    });
    return response;
  } catch (err) {
    console.error("[setup POST]", err);
    if (mongoSession?.inTransaction()) {
      await mongoSession.abortTransaction();
    }
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Setup failed unexpectedly",
      },
      { status: 500 }
    );
  } finally {
    if (mongoSession) {
      mongoSession.endSession();
    }
  }
}
