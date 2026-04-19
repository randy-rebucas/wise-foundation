import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("MONGODB_URI is not set in environment");
  process.exit(1);
}

// --- Inline schemas to avoid Next.js module issues in standalone script ---

const BranchSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    address: { type: String, required: true },
    phone: { type: String },
    email: { type: String, lowercase: true },
    managerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    isHeadOffice: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const RoleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      enum: ["ADMIN", "BRANCH_MANAGER", "STAFF", "INVENTORY_MANAGER", "MEMBER"],
    },
    displayName: { type: String, required: true },
    permissions: [{ type: String }],
    isSystem: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const UserSchema = new mongoose.Schema(
  {
    branchIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Branch" }],
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: {
      type: String,
      required: true,
      enum: ["ADMIN", "BRANCH_MANAGER", "STAFF", "INVENTORY_MANAGER", "MEMBER"],
    },
    permissions: [{ type: String }],
    avatar: { type: String },
    phone: { type: String },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const ADMIN_PERMISSIONS = [
  "manage:branches",
  "manage:users",
  "manage:products",
  "manage:inventory",
  "use:pos",
  "view:reports",
  "manage:members",
  "manage:orders",
  "manage:roles",
];

const ROLES = [
  {
    name: "ADMIN",
    displayName: "Administrator",
    permissions: ADMIN_PERMISSIONS,
    isSystem: true,
  },
  {
    name: "BRANCH_MANAGER",
    displayName: "Branch Manager",
    permissions: ["manage:products", "manage:inventory", "use:pos", "view:reports", "manage:members", "manage:orders"],
    isSystem: true,
  },
  {
    name: "STAFF",
    displayName: "Staff",
    permissions: ["use:pos", "manage:members", "manage:orders"],
    isSystem: true,
  },
  {
    name: "INVENTORY_MANAGER",
    displayName: "Inventory Manager",
    permissions: ["manage:inventory", "view:reports"],
    isSystem: true,
  },
  {
    name: "MEMBER",
    displayName: "Member",
    permissions: ["view:own_orders"],
    isSystem: true,
  },
];

async function seed() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI!);
  console.log("Connected.");

  const db = mongoose.connection.db!;

  // Drop all collections
  console.log("Dropping all collections...");
  const collections = await db.listCollections().toArray();
  for (const col of collections) {
    await db.collection(col.name).drop();
    console.log(`  Dropped: ${col.name}`);
  }

  // Re-register models after dropping
  const Branch = mongoose.model("Branch", BranchSchema);
  const Role = mongoose.model("Role", RoleSchema);
  const User = mongoose.model("User", UserSchema);

  // Seed roles
  console.log("Seeding roles...");
  await Role.insertMany(ROLES);
  console.log(`  ${ROLES.length} roles created.`);

  // Seed head office branch
  console.log("Seeding head office branch...");
  const branch = await Branch.create({
    name: "Head Office",
    code: "HQ",
    address: "Main Office",
    isHeadOffice: true,
    isActive: true,
  });
  console.log(`  Branch created: ${branch.name} (${branch.code})`);

  // Seed admin user
  const adminEmail = "admin@wise.com";
  const adminPassword = "admin123";
  const hashedPassword = await bcrypt.hash(adminPassword, 12);

  console.log("Seeding admin user...");
  const admin = await User.create({
    name: "Admin",
    email: adminEmail,
    password: hashedPassword,
    role: "ADMIN",
    permissions: ADMIN_PERMISSIONS,
    branchIds: [branch._id],
    isActive: true,
  });
  console.log(`  Admin created: ${admin.email}`);

  console.log("\nSeed complete!");
  console.log("-----------------------------");
  console.log(`  Email:    ${adminEmail}`);
  console.log(`  Password: ${adminPassword}`);
  console.log("-----------------------------");

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
