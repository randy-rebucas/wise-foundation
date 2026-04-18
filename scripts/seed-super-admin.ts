/**
 * Run once to create the super admin account:
 *   npx tsx scripts/seed-super-admin.ts
 */
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI!;

async function main() {
  await mongoose.connect(MONGODB_URI);

  // Dynamically import models after connection
  const { User } = await import("../lib/db/models/User");
  const { DEFAULT_ROLE_PERMISSIONS } = await import("../lib/db/models/Role");

  const email = "superadmin@wise.local";
  const password = "SuperAdmin@2024";

  const existing = await User.findOne({ email });
  if (existing) {
    console.log("Super admin already exists:", email);
    await mongoose.disconnect();
    return;
  }

  const hashed = await bcrypt.hash(password, 12);

  await User.create({
    tenantId: new mongoose.Types.ObjectId("000000000000000000000000"), // placeholder — SUPER_ADMIN ignores tenantId
    branchIds: [],
    name: "Super Admin",
    email,
    password: hashed,
    role: "SUPER_ADMIN",
    permissions: DEFAULT_ROLE_PERMISSIONS.SUPER_ADMIN,
    isActive: true,
  });

  console.log("✅ Super admin created");
  console.log("   Email:   ", email);
  console.log("   Password:", password);
  console.log("   Change this password after first login!");

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
