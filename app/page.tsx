import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db/connect";
import { Tenant } from "@/lib/db/models/Tenant";
import mongoose from "mongoose";

export default async function HomePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const { tenantId, role } = session.user;

  if (role === "SUPER_ADMIN") {
    redirect("/super-admin");
  }

  // Validate tenantId is a real ObjectId before hitting the DB
  if (!tenantId || !mongoose.Types.ObjectId.isValid(tenantId)) {
    redirect("/login?error=no_tenant");
  }

  await connectDB();
  const tenant = await Tenant.findOne({ _id: tenantId, deletedAt: null }).lean();

  if (tenant) {
    redirect(`/${tenant.slug}/dashboard`);
  }

  redirect("/login?error=tenant_not_found");
}
