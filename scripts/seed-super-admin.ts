/**
 * Run once to create the admin account:
 *   npx tsx scripts/seed-super-admin.ts
 */
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI!;

async function main() {
  await mongoose.connect(MONGODB_URI);

  const { User } = await import("../lib/db/models/User");
  const { DEFAULT_ROLE_PERMISSIONS } = await import("../lib/db/models/Role");

  const email = "admin@wise.local";
  const password = "Admin@2024";

  const existing = await User.findOne({ email });
  if (existing) {
    console.log("Admin already exists:", email);
    await mongoose.disconnect();
    return;
  }

  const hashed = await bcrypt.hash(password, 12);

  await User.create({
    branchIds: [],
    name: "Admin",
    email,
    password: hashed,
    role: "ADMIN",
    permissions: DEFAULT_ROLE_PERMISSIONS.ADMIN,
    isActive: true,
  });

  console.log("✅ Admin created");
  console.log("   Email:   ", email);
  console.log("   Password:", password);
  console.log("   Change this password after first login!");

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
