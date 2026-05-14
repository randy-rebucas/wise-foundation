import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { successResponse } from "@/lib/utils/apiResponse";
import { isMaintenanceMode } from "@/lib/utils/maintenance";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return successResponse({
    maintenanceActive: isMaintenanceMode(),
    maintenanceEnvValue: process.env.MAINTENANCE_MODE,
    sessionUser: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      role: session.user.role,
    },
    message: isMaintenanceMode()
      ? `Maintenance active. User: ${session.user.name} (${session.user.role})`
      : "System running normally",
  });
}
