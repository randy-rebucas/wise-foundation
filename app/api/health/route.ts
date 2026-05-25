import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connect";
import { pingCloudinary, cloudinaryConfigured } from "@/lib/server/cloudinaryStorage";

type ServiceStatus = "ok" | "degraded" | "unconfigured";

async function checkMongo(): Promise<{ status: ServiceStatus; latencyMs?: number }> {
  const start = Date.now();
  try {
    const mongoose = await connectDB();
    await mongoose.connection.db?.command({ ping: 1 });
    return { status: "ok", latencyMs: Date.now() - start };
  } catch {
    return { status: "degraded" };
  }
}

async function checkCloudinary(): Promise<{ status: ServiceStatus }> {
  if (!cloudinaryConfigured()) return { status: "unconfigured" };
  const result = await pingCloudinary();
  return { status: result.ok ? "ok" : "degraded" };
}

async function checkPaymongo(): Promise<{ status: ServiceStatus }> {
  const key = process.env.PAYMONGO_SECRET_KEY;
  if (!key) return { status: "unconfigured" };
  try {
    const res = await fetch("https://api.paymongo.com/v1/payment_methods", {
      headers: { Authorization: `Basic ${Buffer.from(`${key}:`).toString("base64")}` },
      signal: AbortSignal.timeout(5000),
    });
    return { status: res.ok || res.status === 405 ? "ok" : "degraded" };
  } catch {
    return { status: "degraded" };
  }
}

export async function GET() {
  const [mongo, cloudinary, paymongo] = await Promise.all([
    checkMongo(),
    checkCloudinary(),
    checkPaymongo(),
  ]);

  const degraded =
    mongo.status === "degraded" ||
    cloudinary.status === "degraded" ||
    paymongo.status === "degraded";

  const body = {
    status: degraded ? "degraded" : "ok",
    timestamp: new Date().toISOString(),
    services: { mongo, cloudinary, paymongo },
  };

  return NextResponse.json(body, { status: degraded ? 503 : 200 });
}
