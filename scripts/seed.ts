import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { SYSTEM_ROLE_DEFINITIONS } from "../lib/roles/systemRoles";

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("MONGODB_URI is not set in .env.local");
  process.exit(1);
}

// ─── Inline Schemas ───────────────────────────────────────────────────────────

const s = mongoose.Schema;
const oid = mongoose.Schema.Types.ObjectId;

const RoleSchema = new s({ name: { type: String, required: true, unique: true }, displayName: String, permissions: [String], isSystem: { type: Boolean, default: false }, deletedAt: { type: Date, default: null } }, { timestamps: true });
const BranchSchema = new s({ name: String, code: { type: String, unique: true }, address: String, phone: String, email: String, isHeadOffice: { type: Boolean, default: false }, isActive: { type: Boolean, default: true }, organizationId: { type: oid, ref: "Organization", default: null }, deletedAt: { type: Date, default: null } }, { timestamps: true });
const OrganizationSchema = new s({ name: String, type: { type: String, enum: ["distributor", "franchise", "partner"] }, parentOrganizationId: { type: oid, ref: "Organization", default: null }, settings: { canSellRetail: Boolean, canDistribute: Boolean, hasInventory: Boolean, commissionEnabled: Boolean, canSubmitOrders: Boolean }, contactPerson: String, email: String, phone: String, address: String, commissionRate: { type: Number, default: 10 }, isActive: { type: Boolean, default: true }, deletedAt: { type: Date, default: null } }, { timestamps: true });
const UserSchema = new s({ name: String, email: { type: String, unique: true }, password: String, role: { type: String, enum: ["ADMIN", "ORG_ADMIN", "BRANCH_MANAGER", "STAFF", "INVENTORY_MANAGER", "MEMBER", "CUSTOMER"] }, branchIds: [{ type: oid, ref: "Branch" }], organizationId: { type: oid, ref: "Organization", default: null }, permissions: [String], isActive: { type: Boolean, default: true }, deletedAt: { type: Date, default: null } }, { timestamps: true });
const SupplierSchema = new s({ name: String, contactPerson: String, email: String, phone: String, address: String, isActive: { type: Boolean, default: true }, deletedAt: { type: Date, default: null } }, { timestamps: true });
const ProductSchema = new s({ name: String, slug: String, description: String, category: { type: String, enum: ["homecare", "cosmetics", "wellness", "scent"] }, sku: { type: String, unique: true }, barcode: String, images: [String], retailPrice: Number, isActive: { type: Boolean, default: true }, marketplaceListed: { type: Boolean, default: true }, tags: [String], deletedAt: { type: Date, default: null } }, { timestamps: true });
const ProductVariantSchema = new s({ productId: { type: oid, ref: "Product", required: true }, name: String, sku: { type: String, unique: true }, barcode: String, retailPrice: Number, attributes: { type: Map, of: String }, isActive: { type: Boolean, default: true }, deletedAt: { type: Date, default: null } }, { timestamps: true });
const InventorySchema = new s({ branchId: { type: oid, ref: "Branch" }, productId: { type: oid, ref: "Product" }, variantId: { type: oid, ref: "ProductVariant", default: null }, quantity: { type: Number, default: 0 }, reservedQuantity: { type: Number, default: 0 }, lowStockThreshold: { type: Number, default: 10 } }, { timestamps: true });
const OrgInventorySchema = new s({ organizationId: { type: oid, ref: "Organization" }, productId: { type: oid, ref: "Product" }, variantId: { type: oid, ref: "ProductVariant", default: null }, quantity: { type: Number, default: 0 }, totalSold: { type: Number, default: 0 } }, { timestamps: true });
const MemberSchema = new s({ memberId: String, name: String, email: String, phone: String, address: String, birthdate: Date, discountPercent: { type: Number, default: 10 }, status: { type: String, default: "active" }, branchId: { type: oid, ref: "Branch", default: null }, organizationId: { type: oid, ref: "Organization", default: null }, joinedAt: { type: Date, default: Date.now }, deletedAt: { type: Date, default: null } }, { timestamps: true });
const OrderSchema = new s({ branchId: { type: oid, ref: "Branch", default: null }, organizationId: { type: oid, ref: "Organization", default: null }, buyerOrganizationId: { type: oid, ref: "Organization", default: null }, sellerOrganizationId: { type: oid, ref: "Organization", default: null }, orderNumber: { type: String, unique: true }, type: { type: String, enum: ["POS", "DISTRIBUTOR", "B2B"], default: "POS" }, status: { type: String, enum: ["pending", "approved", "paid", "delivered", "completed", "cancelled", "refunded"], default: "pending" }, memberId: { type: oid, ref: "Member", default: null }, memberName: String, cashierId: { type: oid, ref: "User" }, subtotal: Number, discountAmount: { type: Number, default: 0 }, discountPercent: { type: Number, default: 0 }, total: Number, amountPaid: { type: Number, default: 0 }, change: { type: Number, default: 0 }, paymentMethod: { type: String, default: "cash" }, notes: String, approvedAt: { type: Date, default: null }, paidAt: { type: Date, default: null }, completedAt: { type: Date, default: null }, deliveryReceiptNumber: String, receivedByName: String, deliveredAt: { type: Date, default: null }, deliveredBy: { type: oid, ref: "User", default: null }, deletedAt: { type: Date, default: null } }, { timestamps: true });
const OrderItemSchema = new s({ orderId: { type: oid, ref: "Order" }, productId: { type: oid, ref: "Product" }, variantId: { type: oid, ref: "ProductVariant", default: null }, productName: String, sku: String, quantity: Number, unitPrice: Number, cost: { type: Number, default: 0 }, total: Number }, { timestamps: true });
const PurchaseOrderSchema = new s({ organizationId: { type: oid, ref: "Organization", required: true }, branchId: { type: oid, ref: "Branch", default: null }, poNumber: { type: String, unique: true, required: true }, status: { type: String, enum: ["draft", "submitted", "approved", "received", "cancelled"], default: "draft" }, subtotal: { type: Number, default: 0 }, total: { type: Number, default: 0 }, expectedDeliveryDate: { type: Date, default: null }, notes: String, createdBy: { type: oid, ref: "User", required: true }, approvedBy: { type: oid, ref: "User", default: null }, approvedAt: { type: Date, default: null }, receivedBy: { type: oid, ref: "User", default: null }, receivedAt: { type: Date, default: null }, deletedAt: { type: Date, default: null } }, { timestamps: true });
const PurchaseOrderItemSchema = new s({ purchaseOrderId: { type: oid, ref: "PurchaseOrder", required: true }, productId: { type: oid, ref: "Product", required: true }, variantId: { type: oid, ref: "ProductVariant", default: null }, productName: String, sku: String, quantity: Number, receivedQuantity: { type: Number, default: 0 }, unitCost: Number, total: Number }, { timestamps: true });
const StockMovementSchema = new s({ branchId: { type: oid, ref: "Branch", default: null }, organizationId: { type: oid, ref: "Organization", default: null }, fromOrganizationId: { type: oid, ref: "Organization", default: null }, toOrganizationId: { type: oid, ref: "Organization", default: null }, productId: { type: oid, ref: "Product" }, variantId: { type: oid, ref: "ProductVariant", default: null }, type: { type: String, enum: ["IN", "OUT", "TRANSFER", "ADJUSTMENT"] }, quantity: Number, previousQuantity: Number, newQuantity: Number, reference: String, notes: String, performedBy: { type: oid, ref: "User" } }, { timestamps: true });
const CommissionSchema = new s({ organizationId: { type: oid, ref: "Organization" }, orderId: { type: oid, ref: "Order" }, saleAmount: Number, rate: Number, amount: Number, status: { type: String, enum: ["pending", "paid", "cancelled"], default: "pending" }, paidAt: { type: Date, default: null }, paidBy: { type: oid, ref: "User", default: null }, notes: String }, { timestamps: true });
const TransactionSchema = new s({ branchId: { type: oid, ref: "Branch", default: null }, orderId: { type: oid, ref: "Order" }, type: { type: String, enum: ["SALE", "REFUND", "ADJUSTMENT"] }, amount: Number, paymentMethod: String, performedBy: { type: oid, ref: "User" } }, { timestamps: true });

// ─── Helpers ──────────────────────────────────────────────────────────────────

function slug(name: string) {
  return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

function pad(n: number, length = 6) {
  return String(n).padStart(length, "0");
}

// ─── Seed ─────────────────────────────────────────────────────────────────────

export async function runSeed(): Promise<void> {
  console.log("Connecting to MongoDB…");
  await mongoose.connect(MONGODB_URI!);
  console.log("Connected.\n");

  // Drop all collections
  const db = mongoose.connection.db!;
  console.log("Dropping existing collections…");
  const cols = await db.listCollections().toArray();
  for (const col of cols) {
    await db.collection(col.name).drop();
    console.log(`  dropped: ${col.name}`);
  }

  const now = new Date();
  await db.collection("appsettings").insertOne({
    appName: "Glowish (Seeded)",
    appTagline: "POS & online store",
    currency: "PHP",
    timezone: "Asia/Manila",
    setupCompleted: true,
    memberDefaultDiscountPercent: 10,
    defaultLowStockThreshold: 10,
    receiptFooter: "Thank you for your purchase.",
    createdAt: now,
    updatedAt: now,
  });
  console.log("  appsettings: seeded (setup completed)\n");

  // Re-register models after drop
  const Role         = mongoose.model("Role",              RoleSchema);
  const Branch       = mongoose.model("Branch",            BranchSchema);
  const Organization = mongoose.model("Organization",      OrganizationSchema);
  const User         = mongoose.model("User",              UserSchema);
  const Supplier     = mongoose.model("Supplier",          SupplierSchema);
  const Product      = mongoose.model("Product",           ProductSchema);
  const Variant      = mongoose.model("ProductVariant",    ProductVariantSchema);
  const Inventory    = mongoose.model("Inventory",         InventorySchema);
  const OrgInventory = mongoose.model("OrganizationInventory", OrgInventorySchema);
  const Member       = mongoose.model("Member",            MemberSchema);
  const Order        = mongoose.model("Order",             OrderSchema);
  const OrderItem    = mongoose.model("OrderItem",         OrderItemSchema);
  const PO           = mongoose.model("PurchaseOrder",     PurchaseOrderSchema);
  const POItem       = mongoose.model("PurchaseOrderItem", PurchaseOrderItemSchema);
  const Movement     = mongoose.model("StockMovement",     StockMovementSchema);
  const Commission   = mongoose.model("Commission",        CommissionSchema);
  const Transaction  = mongoose.model("Transaction",       TransactionSchema);

  // ── 1. Roles ────────────────────────────────────────────────────────────────
  console.log("\n[1] Roles");
  await Role.insertMany(SYSTEM_ROLE_DEFINITIONS);
  console.log(`  ${SYSTEM_ROLE_DEFINITIONS.length} roles seeded (from lib/permissions.ts)`);

  // ── 2. Branches ─────────────────────────────────────────────────────────────
  console.log("\n[2] Branches");
  const [hq, northBranch, southBranch] = await Branch.insertMany([
    { name: "Head Office",       code: "HQ",    address: "123 Main Street, Manila",        isHeadOffice: true,  isActive: true },
    { name: "North Branch",      code: "NTH",   address: "45 Quezon Avenue, Quezon City",  isHeadOffice: false, isActive: true },
    { name: "South Branch",      code: "STH",   address: "78 Rizal Street, Paranaque",     isHeadOffice: false, isActive: true },
  ]);
  console.log(`  3 branches seeded`);

  // ── 3. Organizations ────────────────────────────────────────────────────────
  console.log("\n[3] Organizations");
  const [distOrg, franOrg, partnerOrg] = await Organization.insertMany([
    {
      name: "Glowish Distributors Inc.",
      type: "distributor",
      settings: { canSellRetail: false, canDistribute: true, hasInventory: true, commissionEnabled: false, canSubmitOrders: true },
      contactPerson: "Diego Reyes",
      email: "diego@glowish.demo",
      phone: "09171234567",
      address: "10 Industrial Road, Valenzuela",
      commissionRate: 0,
      isActive: true,
    },
    {
      name: "BrightLife Franchise Co.",
      type: "franchise",
      parentOrganizationId: null,
      settings: { canSellRetail: true, canDistribute: false, hasInventory: true, commissionEnabled: false, canSubmitOrders: true },
      contactPerson: "Maria Santos",
      email: "maria@brightlife.com",
      phone: "09181234567",
      address: "22 Commerce Street, Makati",
      commissionRate: 5,
      isActive: true,
    },
    {
      name: "Community Partners PH",
      type: "partner",
      parentOrganizationId: null,
      settings: { canSellRetail: true, canDistribute: false, hasInventory: false, commissionEnabled: true, canSubmitOrders: true },
      contactPerson: "Jose Dela Cruz",
      email: "jose@communitypartners.ph",
      phone: "09191234567",
      address: "5 Barangay Road, Pasig",
      commissionRate: 12,
      isActive: true,
    },
  ]);
  console.log(`  3 organizations seeded`);

  // ── 4. Users ────────────────────────────────────────────────────────────────
  console.log("\n[4] Users");
  const pw = await bcrypt.hash("password123", 12);
  const adminPw = await bcrypt.hash("admin123", 12);

  const [admin, , , , staff1, , invMgr] = await User.insertMany([
    {
      name: "Super Admin",
      email: "admin@glowish.demo",
      password: adminPw,
      role: "ADMIN",
      branchIds: [hq._id],
      permissions: SYSTEM_ROLE_DEFINITIONS.find(r => r.name === "ADMIN")!.permissions,
      isActive: true,
    },
    {
      name: "Diego Reyes",
      email: "diego@glowish.demo",
      password: pw,
      role: "ORG_ADMIN",
      branchIds: [],
      organizationId: distOrg._id,
      permissions: SYSTEM_ROLE_DEFINITIONS.find(r => r.name === "ORG_ADMIN")!.permissions,
      isActive: true,
    },
    {
      name: "Maria Santos",
      email: "maria@brightlife.com",
      password: pw,
      role: "ORG_ADMIN",
      branchIds: [],
      organizationId: franOrg._id,
      permissions: SYSTEM_ROLE_DEFINITIONS.find(r => r.name === "ORG_ADMIN")!.permissions,
      isActive: true,
    },
    {
      name: "Carlos Mendoza",
      email: "carlos@glowish.demo",
      password: pw,
      role: "BRANCH_MANAGER",
      branchIds: [hq._id, northBranch._id],
      permissions: SYSTEM_ROLE_DEFINITIONS.find(r => r.name === "BRANCH_MANAGER")!.permissions,
      isActive: true,
    },
    {
      name: "Ana Garcia",
      email: "ana@glowish.demo",
      password: pw,
      role: "BRANCH_MANAGER",
      branchIds: [southBranch._id],
      permissions: SYSTEM_ROLE_DEFINITIONS.find(r => r.name === "BRANCH_MANAGER")!.permissions,
      isActive: true,
    },
    {
      name: "Rico Bautista",
      email: "rico@glowish.demo",
      password: pw,
      role: "STAFF",
      branchIds: [hq._id],
      permissions: SYSTEM_ROLE_DEFINITIONS.find(r => r.name === "STAFF")!.permissions,
      isActive: true,
    },
    {
      name: "Lisa Torres",
      email: "lisa@glowish.demo",
      password: pw,
      role: "STAFF",
      branchIds: [northBranch._id],
      permissions: SYSTEM_ROLE_DEFINITIONS.find(r => r.name === "STAFF")!.permissions,
      isActive: true,
    },
    {
      name: "Mark Villanueva",
      email: "mark@glowish.demo",
      password: pw,
      role: "INVENTORY_MANAGER",
      branchIds: [hq._id, northBranch._id, southBranch._id],
      permissions: SYSTEM_ROLE_DEFINITIONS.find(r => r.name === "INVENTORY_MANAGER")!.permissions,
      isActive: true,
    },
  ]);
  console.log(`  8 users seeded`);

  // ── 5. Suppliers ────────────────────────────────────────────────────────────
  console.log("\n[5] Suppliers");
  const [sup1, sup2, sup3] = await Supplier.insertMany([
    { name: "Prime Supply Corp.",      contactPerson: "Tony Lim",    email: "tony@primesupply.com",   phone: "028001001", address: "Binondo, Manila",        isActive: true },
    { name: "GreenLeaf Trading",       contactPerson: "Amy Kho",     email: "amy@greenleaf.ph",       phone: "028001002", address: "Divisoria, Manila",      isActive: true },
    { name: "WholesalePH Distributors",contactPerson: "Ben Cruz",    email: "ben@wholesaleph.com",    phone: "028001003", address: "Caloocan City",          isActive: true },
  ]);
  console.log(`  3 suppliers seeded`);

  // ── 6. Products ─────────────────────────────────────────────────────────────
  console.log("\n[6] Products");
  const productsData = [
    { name: "Aloe Fresh Body Wash",      category: "homecare",  sku: "HC-001", retailPrice: 299,  tags: ["body wash", "aloe"] },
    { name: "Citrus All-Purpose Cleaner",category: "homecare",  sku: "HC-002", retailPrice: 199,  tags: ["cleaner", "citrus"] },
    { name: "Herbal Shampoo Bar",        category: "homecare",  sku: "HC-003", retailPrice: 149,  tags: ["shampoo", "herbal"] },
    { name: "Rose Glow Face Serum",      category: "cosmetics", sku: "CS-001", retailPrice: 699,  tags: ["serum", "rose", "glow"] },
    { name: "Matte Lip Color Set",       category: "cosmetics", sku: "CS-002", retailPrice: 499,  tags: ["lipstick", "matte"] },
    { name: "Brightening CC Cream",      category: "cosmetics", sku: "CS-003", retailPrice: 549,  tags: ["cc cream", "brightening"] },
    { name: "Moringa Supplement Capsules",category:"wellness",  sku: "WL-001", retailPrice: 450,  tags: ["supplement", "moringa"] },
    { name: "Collagen Drink Mix",        category: "wellness",  sku: "WL-002", retailPrice: 799,  tags: ["collagen", "drink"] },
    { name: "Turmeric Herbal Tea",       category: "wellness",  sku: "WL-003", retailPrice: 299,  tags: ["tea", "turmeric"] },
    { name: "Lavender Mist Perfume",     category: "scent",     sku: "SC-001", retailPrice: 599,  tags: ["perfume", "lavender"] },
    { name: "Citrus Burst EDT",          category: "scent",     sku: "SC-002", retailPrice: 749,  tags: ["edt", "citrus"] },
    { name: "Midnight Oud Parfum",       category: "scent",     sku: "SC-003", retailPrice: 999,  tags: ["parfum", "oud"] },
  ];

  const featuredImageByCategory: Record<string, string> = {
    homecare:
      "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80",
    cosmetics:
      "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=800&q=80",
    wellness:
      "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&fit=crop&w=800&q=80",
    scent:
      "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=800&q=80",
  };
  const featuredSkuByCategory: Record<string, string> = {
    homecare: "HC-001",
    cosmetics: "CS-001",
    wellness: "WL-001",
    scent: "SC-001",
  };

  const products = await Product.insertMany(
    productsData.map((p) => {
      const isFeatured = featuredSkuByCategory[p.category] === p.sku;
      return {
        ...p,
        slug: slug(p.name),
        images: isFeatured ? [featuredImageByCategory[p.category]] : [],
        isActive: true,
        marketplaceListed: true,
      };
    })
  );
  console.log(`  ${products.length} products seeded`);

  // ── 7. Product Variants ─────────────────────────────────────────────────────
  console.log("\n[7] Product Variants");
  const [p1, p2, p3, p4] = products;
  const variants = await Variant.insertMany([
    { productId: p1._id, name: "250ml",  sku: "HC-001-250", retailPrice: 299, attributes: { size: "250ml" }, isActive: true },
    { productId: p1._id, name: "500ml",  sku: "HC-001-500", retailPrice: 499, attributes: { size: "500ml" }, isActive: true },
    { productId: p2._id, name: "1 Liter",sku: "HC-002-1L",  retailPrice: 349, attributes: { size: "1L" }, isActive: true },
    { productId: p4._id, name: "15ml",   sku: "CS-001-15",  retailPrice: 699, attributes: { size: "15ml" }, isActive: true },
    { productId: p4._id, name: "30ml",   sku: "CS-001-30",  retailPrice: 1099, attributes: { size: "30ml" }, isActive: true },
    { productId: p3._id, name: "Peppermint",sku:"HC-003-PPMNT", retailPrice:149, attributes:{ scent:"Peppermint" }, isActive: true },
  ]);
  console.log(`  ${variants.length} variants seeded`);

  // ── 8. Branch Inventory ─────────────────────────────────────────────────────
  console.log("\n[8] Branch Inventory");
  const inventoryRecords = [];
  const branches = [hq, northBranch, southBranch];
  for (const branch of branches) {
    for (const product of products) {
      inventoryRecords.push({
        branchId: branch._id,
        productId: product._id,
        variantId: null,
        quantity: Math.floor(Math.random() * 80) + 20,
        reservedQuantity: 0,
        lowStockThreshold: 10,
      });
    }
  }
  await Inventory.insertMany(inventoryRecords);
  console.log(`  ${inventoryRecords.length} inventory records seeded (${products.length} products × 3 branches)`);

  // ── 9. Organization Inventory ───────────────────────────────────────────────
  console.log("\n[9] Organization Inventory");
  const orgInvRecords = [];
  for (const product of products) {
    orgInvRecords.push(
      { organizationId: distOrg._id,    productId: product._id, quantity: Math.floor(Math.random() * 200) + 100, totalSold: Math.floor(Math.random() * 50) },
      { organizationId: franOrg._id,    productId: product._id, quantity: Math.floor(Math.random() * 80)  + 20,  totalSold: Math.floor(Math.random() * 30) },
      { organizationId: partnerOrg._id, productId: product._id, quantity: Math.floor(Math.random() * 40)  + 10,  totalSold: Math.floor(Math.random() * 20) }
    );
  }
  await OrgInventory.insertMany(orgInvRecords);
  console.log(`  ${orgInvRecords.length} org inventory records seeded`);

  // ── 10. Members ─────────────────────────────────────────────────────────────
  console.log("\n[10] Members");
  const membersData = [
    { name: "Elena Reyes",    phone: "09171110001", email: "elena@email.com",   discountPercent: 10, status: "active",   branchId: hq._id },
    { name: "Ramon Cruz",     phone: "09171110002", email: "ramon@email.com",   discountPercent: 10, status: "active",   branchId: hq._id },
    { name: "Sofia Lim",      phone: "09171110003", email: "sofia@email.com",   discountPercent: 15, status: "active",   branchId: northBranch._id },
    { name: "Andre Pascual",  phone: "09171110004", email: "andre@email.com",   discountPercent: 10, status: "active",   branchId: northBranch._id },
    { name: "Clarissa Tan",   phone: "09171110005", email: "clarissa@email.com",discountPercent: 10, status: "inactive", branchId: southBranch._id },
    { name: "Marco Villaluz", phone: "09171110006", email: "marco@email.com",   discountPercent: 20, status: "active",   branchId: southBranch._id },
  ];
  const members = await Member.insertMany(
    membersData.map((m, i) => ({ ...m, memberId: `GLOW-${pad(i + 1)}`, joinedAt: new Date(Date.now() - i * 7 * 86400000) }))
  );
  console.log(`  ${members.length} members seeded`);

  // ── 11. POS Orders + Items ──────────────────────────────────────────────────
  console.log("\n[11] POS Orders");

  const posOrdersData = [
    { branch: hq,          member: members[0], items: [{ p: products[0], qty: 2 }, { p: products[6], qty: 1 }], payment: "cash",          paid: 1200 },
    { branch: hq,          member: members[1], items: [{ p: products[3], qty: 1 }, { p: products[9], qty: 1 }], payment: "gcash",         paid: 1300 },
    { branch: northBranch, member: members[2], items: [{ p: products[1], qty: 3 }],                              payment: "cash",          paid: 600  },
    { branch: northBranch, member: null,        items: [{ p: products[7], qty: 1 }, { p: products[4], qty: 2 }], payment: "card",          paid: 1800 },
    { branch: southBranch, member: members[5], items: [{ p: products[11], qty: 1 }],                             payment: "gcash",         paid: 999  },
    { branch: southBranch, member: null,        items: [{ p: products[2], qty: 2 }, { p: products[8], qty: 1 }], payment: "bank_transfer", paid: 900  },
  ];

  const createdOrders = [];
  for (let i = 0; i < posOrdersData.length; i++) {
    const { branch, member, items, payment, paid } = posOrdersData[i];
    const subtotal = items.reduce((s, it) => s + it.p.retailPrice * it.qty, 0);
    const disc = member ? (subtotal * (member.discountPercent / 100)) : 0;
    const total = subtotal - disc;
    const orderDate = new Date(Date.now() - (posOrdersData.length - i) * 2 * 86400000);

    const order = await Order.create({
      branchId: branch._id,
      orderNumber: `POS-${pad(i + 1)}`,
      type: "POS",
      status: "completed",
      memberId: member?._id ?? null,
      memberName: member?.name ?? null,
      cashierId: staff1._id,
      subtotal,
      discountAmount: disc,
      discountPercent: member?.discountPercent ?? 0,
      total,
      amountPaid: paid,
      change: Math.max(0, paid - total),
      paymentMethod: payment,
      paidAt: orderDate,
      completedAt: orderDate,
      createdAt: orderDate,
    });

    await OrderItem.insertMany(items.map((it) => ({
      orderId: order._id,
      productId: it.p._id,
      productName: it.p.name,
      sku: it.p.sku,
      quantity: it.qty,
      unitPrice: it.p.retailPrice,
      cost: 0,
      total: it.p.retailPrice * it.qty,
    })));

    await Transaction.create({ branchId: branch._id, orderId: order._id, type: "SALE", amount: total, paymentMethod: payment, performedBy: staff1._id });
    createdOrders.push(order);
  }
  console.log(`  ${createdOrders.length} POS orders seeded`);

  // ── 12. B2B Orders ──────────────────────────────────────────────────────────
  console.log("\n[12] B2B Orders");
  const b2bOrders = [];
  const b2bData = [
    { seller: distOrg, buyer: franOrg, items: [{ p: products[0], qty: 50 }, { p: products[6], qty: 30 }], status: "approved" },
    { seller: distOrg, buyer: partnerOrg, items: [{ p: products[3], qty: 20 }, { p: products[9], qty: 15 }], status: "paid" },
    { seller: franOrg, buyer: partnerOrg, items: [{ p: products[1], qty: 40 }], status: "pending" },
  ] as const;

  for (let i = 0; i < b2bData.length; i++) {
    const { seller, buyer, items, status } = b2bData[i];
    const subtotal = items.reduce((s, it) => s + it.p.retailPrice * it.qty, 0);
    const orderDate = new Date(Date.now() - (b2bData.length - i) * 5 * 86400000);

    const order = await Order.create({
      orderNumber: `B2B-${pad(i + 1)}`,
      type: "B2B",
      status,
      sellerOrganizationId: seller._id,
      buyerOrganizationId: buyer._id,
      cashierId: admin._id,
      subtotal,
      discountAmount: 0,
      discountPercent: 0,
      total: subtotal,
      amountPaid: status === "paid" ? subtotal : 0,
      change: 0,
      paymentMethod: "bank_transfer",
      paidAt: status === "paid" ? orderDate : null,
      approvedAt: ["approved", "paid"].includes(status) ? orderDate : null,
      createdAt: orderDate,
    });

    await OrderItem.insertMany(items.map((it) => ({
      orderId: order._id,
      productId: it.p._id,
      productName: it.p.name,
      sku: it.p.sku,
      quantity: it.qty,
      unitPrice: it.p.retailPrice,
      cost: 0,
      total: it.p.retailPrice * it.qty,
    })));

    b2bOrders.push(order);
  }
  console.log(`  ${b2bOrders.length} B2B orders seeded`);

  // ── 13. Purchase Orders ─────────────────────────────────────────────────────
  console.log("\n[13] Purchase Orders");
  const poData = [
    {
      organization: distOrg,
      branch: hq,
      items: [
        { p: products[0], qty: 100, unitCost: Math.round(products[0].retailPrice * 0.4) },
        { p: products[3], qty: 50, unitCost: Math.round(products[3].retailPrice * 0.4) },
      ],
      status: "received",
    },
    {
      organization: franOrg,
      branch: northBranch,
      items: [
        { p: products[6], qty: 80, unitCost: Math.round(products[6].retailPrice * 0.4) },
        { p: products[7], qty: 60, unitCost: Math.round(products[7].retailPrice * 0.4) },
      ],
      status: "approved",
    },
    {
      organization: partnerOrg,
      branch: null,
      items: [
        { p: products[9], qty: 40, unitCost: Math.round(products[9].retailPrice * 0.4) },
        { p: products[11], qty: 30, unitCost: Math.round(products[11].retailPrice * 0.4) },
      ],
      status: "submitted",
    },
    {
      organization: distOrg,
      branch: null,
      items: [{ p: products[1], qty: 120, unitCost: Math.round(products[1].retailPrice * 0.4) }],
      status: "draft",
    },
  ] as const;

  for (let i = 0; i < poData.length; i++) {
    const { organization, branch, items, status } = poData[i];
    const subtotal = items.reduce((s, it) => s + it.unitCost * it.qty, 0);
    const poDate = new Date(Date.now() - (poData.length - i) * 10 * 86400000);

    const po = await PO.create({
      poNumber: `PO-${pad(i + 1)}`,
      organizationId: organization._id,
      branchId: branch?._id ?? null,
      status,
      subtotal,
      total: subtotal,
      notes: `Replenishment for ${organization.name}`,
      expectedDeliveryDate: new Date(poDate.getTime() + 7 * 86400000),
      receivedAt: status === "received" ? new Date(poDate.getTime() + 5 * 86400000) : null,
      receivedBy: status === "received" ? invMgr._id : null,
      createdBy: admin._id,
      createdAt: poDate,
    });

    await POItem.insertMany(
      items.map((it) => ({
        purchaseOrderId: po._id,
        productId: it.p._id,
        productName: it.p.name,
        sku: it.p.sku,
        quantity: it.qty,
        receivedQuantity: status === "received" ? it.qty : 0,
        unitCost: it.unitCost,
        total: it.unitCost * it.qty,
      }))
    );
  }
  console.log(`  ${poData.length} purchase orders seeded`);

  // ── 14. Stock Movements ─────────────────────────────────────────────────────
  console.log("\n[14] Stock Movements");
  const movementsData = [
    { branch: hq,          product: products[0],  type: "IN",         qty: 100, prev: 20,  next: 120, ref: "PO-000001" },
    { branch: northBranch, product: products[6],  type: "IN",         qty: 80,  prev: 15,  next: 95,  ref: "PO-000002" },
    { branch: southBranch, product: products[9],  type: "IN",         qty: 40,  prev: 10,  next: 50,  ref: "PO-000003" },
    { branch: hq,          product: products[3],  type: "OUT",        qty: 5,   prev: 50,  next: 45,  ref: "POS-000001" },
    { branch: northBranch, product: products[1],  type: "OUT",        qty: 3,   prev: 30,  next: 27,  ref: "POS-000003" },
    { branch: hq,          product: products[7],  type: "TRANSFER",   qty: 20,  prev: 60,  next: 40,  ref: "TRF-001", notes: "Transfer to North Branch" },
    { branch: northBranch, product: products[7],  type: "IN",         qty: 20,  prev: 10,  next: 30,  ref: "TRF-001", notes: "Received from HQ" },
    { branch: southBranch, product: products[11], type: "ADJUSTMENT", qty: -2,  prev: 25,  next: 23,  ref: "ADJ-001", notes: "Damaged goods" },
  ];

  await Movement.insertMany(movementsData.map((m) => ({
    branchId: m.branch._id,
    productId: m.product._id,
    type: m.type,
    quantity: Math.abs(m.qty),
    previousQuantity: m.prev,
    newQuantity: m.next,
    reference: m.ref,
    notes: m.notes ?? null,
    performedBy: invMgr._id,
  })));
  console.log(`  ${movementsData.length} stock movements seeded`);

  // ── 15. Commissions ─────────────────────────────────────────────────────────
  console.log("\n[15] Commissions");
  const partnerSaleOrders = createdOrders.slice(0, 3) as typeof createdOrders;
  const commRate = partnerOrg.commissionRate;

  await Commission.insertMany([
    {
      organizationId: partnerOrg._id,
      orderId: partnerSaleOrders[0]._id,
      saleAmount: partnerSaleOrders[0].total,
      rate: commRate,
      amount: parseFloat((((partnerSaleOrders[0]?.total ?? 0) * commRate) / 100).toFixed(2)),
      status: "paid",
      paidAt: new Date(Date.now() - 5 * 86400000),
      paidBy: admin._id,
      notes: "Monthly payout — April",
    },
    {
      organizationId: partnerOrg._id,
      orderId: partnerSaleOrders[1]?._id,
      saleAmount: partnerSaleOrders[1]?.total ?? 0,
      rate: commRate,
      amount: parseFloat((((partnerSaleOrders[1]?.total ?? 0) * commRate) / 100).toFixed(2)),
      status: "pending",
    },
    {
      organizationId: partnerOrg._id,
      orderId: partnerSaleOrders[2]?._id,
      saleAmount: partnerSaleOrders[2]?.total ?? 0,
      rate: commRate,
      amount: parseFloat((((partnerSaleOrders[2]?.total ?? 0) * commRate) / 100).toFixed(2)),
      status: "pending",
    },
  ]);
  console.log(`  3 commission records seeded`);

  // ── 16. Customer Users & Product Reviews ────────────────────────────────────
  console.log("\n[16] Customer Users & Reviews");

  const customerPw = await bcrypt.hash("password123", 12);
  const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString();
  const revId = () => new mongoose.Types.ObjectId().toString().slice(-12);

  const customerUsersWithReviews = [
    {
      name: "Ana Reyes",
      email: "ana.reyes@email.com",
      password: customerPw,
      role: "CUSTOMER",
      isActive: true,
      emailVerified: true,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      marketplace: {
        wishlist: [],
        savedAddresses: [],
        paymentMethods: [],
        reviews: [
          { id: revId(), productId: products[0]._id.toString(), productName: "Aloe Fresh Body Wash",    productSlug: "aloe-fresh-body-wash",    rating: 5, text: "Love this body wash! Leaves my skin so soft and smells absolutely amazing. Will definitely buy again.",                                  createdAt: daysAgo(5) },
          { id: revId(), productId: products[3]._id.toString(), productName: "Rose Glow Face Serum",    productSlug: "rose-glow-face-serum",    rating: 5, text: "This serum has transformed my skin in just 2 weeks. My glow is real! Best skincare purchase I've ever made.",                      createdAt: daysAgo(12) },
          { id: revId(), productId: products[9]._id.toString(), productName: "Lavender Mist Perfume",  productSlug: "lavender-mist-perfume",   rating: 4, text: "Beautiful scent that lasts throughout the day. Great gift idea too. The packaging is also very elegant.",                         createdAt: daysAgo(20) },
        ],
      },
    },
    {
      name: "Miguel Santos",
      email: "miguel.santos@email.com",
      password: customerPw,
      role: "CUSTOMER",
      isActive: true,
      emailVerified: true,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      marketplace: {
        wishlist: [],
        savedAddresses: [],
        paymentMethods: [],
        reviews: [
          { id: revId(), productId: products[1]._id.toString(),  productName: "Citrus All-Purpose Cleaner",  productSlug: "citrus-all-purpose-cleaner",  rating: 2, text: "The citrus scent is way too overpowering. Gave me a headache every time I used it. Not suitable for small spaces.", createdAt: daysAgo(8) },
          { id: revId(), productId: products[6]._id.toString(),  productName: "Moringa Supplement Capsules", productSlug: "moringa-supplement-capsules", rating: 5, text: "The Moringa capsules are easy to swallow and I genuinely feel more energetic after 3 weeks. Highly recommend!", createdAt: daysAgo(15) },
          { id: revId(), productId: products[10]._id.toString(), productName: "Citrus Burst EDT",            productSlug: "citrus-burst-edt",            rating: 4, text: "Fresh and clean scent. The bottle design is stylish too. Gets lots of compliments whenever I wear it.",         createdAt: daysAgo(22) },
        ],
      },
    },
    {
      name: "Carla Mendoza",
      email: "carla.mendoza@email.com",
      password: customerPw,
      role: "CUSTOMER",
      isActive: true,
      emailVerified: true,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      marketplace: {
        wishlist: [],
        savedAddresses: [],
        paymentMethods: [],
        reviews: [
          { id: revId(), productId: products[4]._id.toString(), productName: "Matte Lip Color Set",  productSlug: "matte-lip-color-set",  rating: 1, text: "The colors look completely different from the photos online. Very disappointed with this purchase. Will not rebuy.",      createdAt: daysAgo(3) },
          { id: revId(), productId: products[7]._id.toString(), productName: "Collagen Drink Mix",   productSlug: "collagen-drink-mix",   rating: 3, text: "Taste is okay I guess. Not sure if it's working yet but I'll keep trying for another month before deciding.",               createdAt: daysAgo(18) },
          { id: revId(), productId: products[2]._id.toString(), productName: "Herbal Shampoo Bar",   productSlug: "herbal-shampoo-bar",   rating: 4, text: "Good lather and a nice herbal scent. Took a little getting used to the shampoo bar format but now I love it.",            createdAt: daysAgo(25) },
        ],
      },
    },
    {
      name: "Jose Lim",
      email: "jose.lim@email.com",
      password: customerPw,
      role: "CUSTOMER",
      isActive: true,
      emailVerified: true,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      marketplace: {
        wishlist: [],
        savedAddresses: [],
        paymentMethods: [],
        reviews: [
          { id: revId(), productId: products[11]._id.toString(), productName: "Midnight Oud Parfum",  productSlug: "midnight-oud-parfum",  rating: 1, text: "The oud scent completely disappeared within 30 minutes of application. Absolutely not worth ₱999. Very disappointed.", createdAt: daysAgo(2) },
          { id: revId(), productId: products[5]._id.toString(),  productName: "Brightening CC Cream", productSlug: "brightening-cc-cream", rating: 4, text: "Great coverage and feels really light on the skin. Matches my skin tone very well. Will definitely repurchase.",          createdAt: daysAgo(30) },
          { id: revId(), productId: products[8]._id.toString(),  productName: "Turmeric Herbal Tea",  productSlug: "turmeric-herbal-tea",  rating: 5, text: "Best herbal tea I've ever tried! Super calming and great for digestion. Drinking it every night now.",                  createdAt: daysAgo(35) },
        ],
      },
    },
    {
      name: "Sofia Cruz",
      email: "sofia.cruz@email.com",
      password: customerPw,
      role: "CUSTOMER",
      isActive: true,
      emailVerified: true,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      marketplace: {
        wishlist: [],
        savedAddresses: [],
        paymentMethods: [],
        reviews: [
          { id: revId(), productId: products[2]._id.toString(), productName: "Herbal Shampoo Bar",   productSlug: "herbal-shampoo-bar",   rating: 2, text: "Left my hair feeling waxy and dull after the first use. Had to use my regular shampoo afterward to fix it. Very disappointing.", createdAt: daysAgo(7) },
          { id: revId(), productId: products[3]._id.toString(), productName: "Rose Glow Face Serum", productSlug: "rose-glow-face-serum", rating: 5, text: "I've been using Rose Glow for a month and my skin has never looked better. Genuinely worth every peso!",                         createdAt: daysAgo(14) },
          { id: revId(), productId: products[9]._id.toString(), productName: "Lavender Mist Perfume",productSlug: "lavender-mist-perfume",rating: 5, text: "Lavender Mist is now my signature scent. Long-lasting and absolutely heavenly. Already bought my second bottle!",              createdAt: daysAgo(21) },
        ],
      },
    },
    {
      name: "Bianca Torres",
      email: "bianca.torres@email.com",
      password: customerPw,
      role: "CUSTOMER",
      isActive: true,
      emailVerified: true,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      marketplace: {
        wishlist: [],
        savedAddresses: [],
        paymentMethods: [],
        reviews: [
          { id: revId(), productId: products[0]._id.toString(), productName: "Aloe Fresh Body Wash", productSlug: "aloe-fresh-body-wash", rating: 4, text: "Nice body wash, smells great and leaves skin moisturized. Good value for money. Bought for the whole family.",                       createdAt: daysAgo(10) },
          { id: revId(), productId: products[7]._id.toString(), productName: "Collagen Drink Mix",   productSlug: "collagen-drink-mix",   rating: 2, text: "I expected more from a collagen drink at this price point. The flavor is off and I've seen minimal results after a full month.",  createdAt: daysAgo(16) },
          { id: revId(), productId: products[4]._id.toString(), productName: "Matte Lip Color Set",  productSlug: "matte-lip-color-set",  rating: 4, text: "The lip colors are pigmented and last all day without drying my lips. Love the matte finish on all 6 shades.",                     createdAt: daysAgo(28) },
        ],
      },
    },
  ];

  const totalReviews = customerUsersWithReviews.reduce((s, u) => s + u.marketplace.reviews.length, 0);
  await db.collection("users").insertMany(customerUsersWithReviews);
  console.log(`  ${customerUsersWithReviews.length} customer users with ${totalReviews} reviews seeded`);
  console.log("  Customer login: ana.reyes@email.com / password123");

  // ─── Summary ────────────────────────────────────────────────────────────────
  console.log("\n════════════════════════════════════════");
  console.log("  Seed Complete!");
  console.log("════════════════════════════════════════");
  console.log("\n  LOGIN CREDENTIALS");
  console.log("  ──────────────────────────────────────");
  console.log("  ADMIN");
  console.log("    Email:    admin@glowish.demo");
  console.log("    Password: admin123");
  console.log("\n  ORG ADMIN (Distributor)");
  console.log("    Email:    diego@glowish.demo");
  console.log("    Password: password123");
  console.log("\n  ORG ADMIN (Franchise)");
  console.log("    Email:    maria@brightlife.com");
  console.log("    Password: password123");
  console.log("\n  BRANCH MANAGER (HQ + North)");
  console.log("    Email:    carlos@glowish.demo");
  console.log("    Password: password123");
  console.log("\n  BRANCH MANAGER (South)");
  console.log("    Email:    ana@glowish.demo");
  console.log("    Password: password123");
  console.log("\n  STAFF");
  console.log("    Email:    rico@glowish.demo");
  console.log("    Password: password123");
  console.log("\n  INVENTORY MANAGER");
  console.log("    Email:    mark@glowish.demo");
  console.log("    Password: password123");
  console.log("\n  CUSTOMERS (6 users with reviews)");
  console.log("    Email:    ana.reyes@email.com");
  console.log("    Password: password123");
  console.log("════════════════════════════════════════\n");

  await mongoose.disconnect();
}

function isInvokedDirectly(): boolean {
  const invoked = process.argv[1];
  if (!invoked) return false;
  const here = fileURLToPath(import.meta.url);
  return path.resolve(invoked) === path.resolve(here);
}

if (isInvokedDirectly()) {
  runSeed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("\nSeed failed:", err);
      process.exit(1);
    });
}
