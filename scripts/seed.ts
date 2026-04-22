import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

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
const UserSchema = new s({ name: String, email: { type: String, unique: true }, password: String, role: { type: String, enum: ["ADMIN", "ORG_ADMIN", "BRANCH_MANAGER", "STAFF", "INVENTORY_MANAGER", "MEMBER"] }, branchIds: [{ type: oid, ref: "Branch" }], organizationId: { type: oid, ref: "Organization", default: null }, permissions: [String], isActive: { type: Boolean, default: true }, deletedAt: { type: Date, default: null } }, { timestamps: true });
const SupplierSchema = new s({ name: String, contactPerson: String, email: String, phone: String, address: String, isActive: { type: Boolean, default: true }, deletedAt: { type: Date, default: null } }, { timestamps: true });
const ProductSchema = new s({ name: String, slug: String, description: String, category: { type: String, enum: ["homecare", "cosmetics", "wellness", "scent"] }, sku: { type: String, unique: true }, barcode: String, images: [String], retailPrice: Number, memberPrice: Number, distributorPrice: Number, cost: Number, isActive: { type: Boolean, default: true }, tags: [String], deletedAt: { type: Date, default: null } }, { timestamps: true });
const ProductVariantSchema = new s({ productId: { type: oid, ref: "Product", required: true }, name: String, sku: { type: String, unique: true }, barcode: String, retailPrice: Number, memberPrice: Number, distributorPrice: Number, cost: Number, attributes: { type: Map, of: String }, isActive: { type: Boolean, default: true }, deletedAt: { type: Date, default: null } }, { timestamps: true });
const InventorySchema = new s({ branchId: { type: oid, ref: "Branch" }, productId: { type: oid, ref: "Product" }, variantId: { type: oid, ref: "ProductVariant", default: null }, quantity: { type: Number, default: 0 }, reservedQuantity: { type: Number, default: 0 }, lowStockThreshold: { type: Number, default: 10 } }, { timestamps: true });
const OrgInventorySchema = new s({ organizationId: { type: oid, ref: "Organization" }, productId: { type: oid, ref: "Product" }, variantId: { type: oid, ref: "ProductVariant", default: null }, quantity: { type: Number, default: 0 }, totalSold: { type: Number, default: 0 } }, { timestamps: true });
const MemberSchema = new s({ memberId: String, name: String, email: String, phone: String, address: String, birthdate: Date, discountPercent: { type: Number, default: 10 }, status: { type: String, default: "active" }, branchId: { type: oid, ref: "Branch", default: null }, organizationId: { type: oid, ref: "Organization", default: null }, joinedAt: { type: Date, default: Date.now }, deletedAt: { type: Date, default: null } }, { timestamps: true });
const OrderSchema = new s({ branchId: { type: oid, ref: "Branch", default: null }, organizationId: { type: oid, ref: "Organization", default: null }, buyerOrganizationId: { type: oid, ref: "Organization", default: null }, sellerOrganizationId: { type: oid, ref: "Organization", default: null }, orderNumber: { type: String, unique: true }, type: { type: String, enum: ["POS", "DISTRIBUTOR", "B2B"], default: "POS" }, status: { type: String, enum: ["pending", "approved", "paid", "delivered", "completed", "cancelled", "refunded"], default: "pending" }, memberId: { type: oid, ref: "Member", default: null }, memberName: String, cashierId: { type: oid, ref: "User" }, subtotal: Number, discountAmount: { type: Number, default: 0 }, discountPercent: { type: Number, default: 0 }, total: Number, amountPaid: { type: Number, default: 0 }, change: { type: Number, default: 0 }, paymentMethod: { type: String, default: "cash" }, notes: String, approvedAt: { type: Date, default: null }, paidAt: { type: Date, default: null }, completedAt: { type: Date, default: null }, deliveryReceiptNumber: String, receivedByName: String, deliveredAt: { type: Date, default: null }, deliveredBy: { type: oid, ref: "User", default: null }, deletedAt: { type: Date, default: null } }, { timestamps: true });
const OrderItemSchema = new s({ orderId: { type: oid, ref: "Order" }, productId: { type: oid, ref: "Product" }, variantId: { type: oid, ref: "ProductVariant", default: null }, productName: String, sku: String, quantity: Number, unitPrice: Number, cost: { type: Number, default: 0 }, total: Number }, { timestamps: true });
const PurchaseOrderSchema = new s({ poNumber: { type: String, unique: true }, branchId: { type: oid, ref: "Branch" }, supplierId: { type: oid, ref: "Supplier" }, status: { type: String, enum: ["draft", "submitted", "approved", "received", "cancelled"], default: "draft" }, subtotal: { type: Number, default: 0 }, tax: { type: Number, default: 0 }, total: { type: Number, default: 0 }, notes: String, expectedAt: Date, receivedAt: Date, createdBy: { type: oid, ref: "User" }, deletedAt: { type: Date, default: null } }, { timestamps: true });
const PurchaseOrderItemSchema = new s({ purchaseOrderId: { type: oid, ref: "PurchaseOrder" }, productId: { type: oid, ref: "Product" }, variantId: { type: oid, ref: "ProductVariant", default: null }, productName: String, sku: String, quantityOrdered: Number, quantityReceived: { type: Number, default: 0 }, unitCost: Number, total: Number }, { timestamps: true });
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

async function seed() {
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
  const ROLES = [
    { name: "ADMIN",             displayName: "Administrator",      isSystem: true, permissions: ["manage:branches","manage:users","manage:products","manage:inventory","use:pos","view:reports","manage:members","manage:orders","manage:roles","manage:organizations"] },
    { name: "ORG_ADMIN",         displayName: "Organization Admin", isSystem: true, permissions: ["manage:org_inventory","view:org_commissions","submit:org_orders","view:reports","manage:orders","manage:members","use:pos"] },
    { name: "BRANCH_MANAGER",    displayName: "Branch Manager",     isSystem: true, permissions: ["manage:products","manage:inventory","use:pos","view:reports","manage:members","manage:orders"] },
    { name: "STAFF",             displayName: "Staff",              isSystem: true, permissions: ["use:pos","manage:members","manage:orders"] },
    { name: "INVENTORY_MANAGER", displayName: "Inventory Manager",  isSystem: true, permissions: ["manage:inventory","view:reports"] },
    { name: "MEMBER",            displayName: "Member",             isSystem: true, permissions: ["view:own_orders"] },
  ];
  await Role.insertMany(ROLES);
  console.log(`  ${ROLES.length} roles seeded`);

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
      name: "Wise Distributors Inc.",
      type: "distributor",
      settings: { canSellRetail: false, canDistribute: true, hasInventory: true, commissionEnabled: false, canSubmitOrders: true },
      contactPerson: "Diego Reyes",
      email: "diego@wisedist.com",
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

  const [admin, orgAdminUser, branchMgr1, branchMgr2, staff1, staff2, invMgr] = await User.insertMany([
    {
      name: "Super Admin",
      email: "admin@wise.com",
      password: adminPw,
      role: "ADMIN",
      branchIds: [hq._id],
      permissions: ROLES.find(r => r.name === "ADMIN")!.permissions,
      isActive: true,
    },
    {
      name: "Diego Reyes",
      email: "diego@wisedist.com",
      password: pw,
      role: "ORG_ADMIN",
      branchIds: [],
      organizationId: distOrg._id,
      permissions: ROLES.find(r => r.name === "ORG_ADMIN")!.permissions,
      isActive: true,
    },
    {
      name: "Maria Santos",
      email: "maria@brightlife.com",
      password: pw,
      role: "ORG_ADMIN",
      branchIds: [],
      organizationId: franOrg._id,
      permissions: ROLES.find(r => r.name === "ORG_ADMIN")!.permissions,
      isActive: true,
    },
    {
      name: "Carlos Mendoza",
      email: "carlos@wise.com",
      password: pw,
      role: "BRANCH_MANAGER",
      branchIds: [hq._id, northBranch._id],
      permissions: ROLES.find(r => r.name === "BRANCH_MANAGER")!.permissions,
      isActive: true,
    },
    {
      name: "Ana Garcia",
      email: "ana@wise.com",
      password: pw,
      role: "BRANCH_MANAGER",
      branchIds: [southBranch._id],
      permissions: ROLES.find(r => r.name === "BRANCH_MANAGER")!.permissions,
      isActive: true,
    },
    {
      name: "Rico Bautista",
      email: "rico@wise.com",
      password: pw,
      role: "STAFF",
      branchIds: [hq._id],
      permissions: ROLES.find(r => r.name === "STAFF")!.permissions,
      isActive: true,
    },
    {
      name: "Lisa Torres",
      email: "lisa@wise.com",
      password: pw,
      role: "STAFF",
      branchIds: [northBranch._id],
      permissions: ROLES.find(r => r.name === "STAFF")!.permissions,
      isActive: true,
    },
    {
      name: "Mark Villanueva",
      email: "mark@wise.com",
      password: pw,
      role: "INVENTORY_MANAGER",
      branchIds: [hq._id, northBranch._id, southBranch._id],
      permissions: ROLES.find(r => r.name === "INVENTORY_MANAGER")!.permissions,
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
    { name: "Aloe Fresh Body Wash",      category: "homecare",  sku: "HC-001", retailPrice: 299,  memberPrice: 249,  distributorPrice: 180, cost: 120, tags: ["body wash", "aloe"] },
    { name: "Citrus All-Purpose Cleaner",category: "homecare",  sku: "HC-002", retailPrice: 199,  memberPrice: 169,  distributorPrice: 120, cost: 75,  tags: ["cleaner", "citrus"] },
    { name: "Herbal Shampoo Bar",        category: "homecare",  sku: "HC-003", retailPrice: 149,  memberPrice: 129,  distributorPrice: 90,  cost: 55,  tags: ["shampoo", "herbal"] },
    { name: "Rose Glow Face Serum",      category: "cosmetics", sku: "CS-001", retailPrice: 699,  memberPrice: 599,  distributorPrice: 450, cost: 280, tags: ["serum", "rose", "glow"] },
    { name: "Matte Lip Color Set",       category: "cosmetics", sku: "CS-002", retailPrice: 499,  memberPrice: 419,  distributorPrice: 300, cost: 180, tags: ["lipstick", "matte"] },
    { name: "Brightening CC Cream",      category: "cosmetics", sku: "CS-003", retailPrice: 549,  memberPrice: 469,  distributorPrice: 330, cost: 200, tags: ["cc cream", "brightening"] },
    { name: "Moringa Supplement Capsules",category:"wellness",  sku: "WL-001", retailPrice: 450,  memberPrice: 380,  distributorPrice: 270, cost: 160, tags: ["supplement", "moringa"] },
    { name: "Collagen Drink Mix",        category: "wellness",  sku: "WL-002", retailPrice: 799,  memberPrice: 679,  distributorPrice: 500, cost: 320, tags: ["collagen", "drink"] },
    { name: "Turmeric Herbal Tea",       category: "wellness",  sku: "WL-003", retailPrice: 299,  memberPrice: 249,  distributorPrice: 175, cost: 100, tags: ["tea", "turmeric"] },
    { name: "Lavender Mist Perfume",     category: "scent",     sku: "SC-001", retailPrice: 599,  memberPrice: 499,  distributorPrice: 360, cost: 220, tags: ["perfume", "lavender"] },
    { name: "Citrus Burst EDT",          category: "scent",     sku: "SC-002", retailPrice: 749,  memberPrice: 629,  distributorPrice: 450, cost: 280, tags: ["edt", "citrus"] },
    { name: "Midnight Oud Parfum",       category: "scent",     sku: "SC-003", retailPrice: 999,  memberPrice: 849,  distributorPrice: 600, cost: 380, tags: ["parfum", "oud"] },
  ];

  const products = await Product.insertMany(
    productsData.map((p) => ({ ...p, slug: slug(p.name), images: [], isActive: true }))
  );
  console.log(`  ${products.length} products seeded`);

  // ── 7. Product Variants ─────────────────────────────────────────────────────
  console.log("\n[7] Product Variants");
  const [p1, p2, p3, p4] = products;
  const variants = await Variant.insertMany([
    { productId: p1._id, name: "250ml",  sku: "HC-001-250", retailPrice: 299, memberPrice: 249, distributorPrice: 180, cost: 120, attributes: { size: "250ml" }, isActive: true },
    { productId: p1._id, name: "500ml",  sku: "HC-001-500", retailPrice: 499, memberPrice: 419, distributorPrice: 300, cost: 190, attributes: { size: "500ml" }, isActive: true },
    { productId: p2._id, name: "1 Liter",sku: "HC-002-1L",  retailPrice: 349, memberPrice: 299, distributorPrice: 210, cost: 130, attributes: { size: "1L" }, isActive: true },
    { productId: p4._id, name: "15ml",   sku: "CS-001-15",  retailPrice: 699, memberPrice: 599, distributorPrice: 450, cost: 280, attributes: { size: "15ml" }, isActive: true },
    { productId: p4._id, name: "30ml",   sku: "CS-001-30",  retailPrice: 1099,memberPrice: 929, distributorPrice: 700, cost: 450, attributes: { size: "30ml" }, isActive: true },
    { productId: p3._id, name: "Peppermint",sku:"HC-003-PPMNT", retailPrice:149, memberPrice:129, distributorPrice:90, cost:55, attributes:{ scent:"Peppermint" }, isActive: true },
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
    membersData.map((m, i) => ({ ...m, memberId: `WISE-${pad(i + 1)}`, joinedAt: new Date(Date.now() - i * 7 * 86400000) }))
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
      cost: it.p.cost,
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
    { seller: distOrg, buyer: franOrg,    items: [{ p: products[0], qty: 50 }, { p: products[6], qty: 30 }], status: "approved" },
    { seller: distOrg, buyer: partnerOrg, items: [{ p: products[3], qty: 20 }, { p: products[9], qty: 15 }], status: "paid"     },
    { seller: franOrg, buyer: partnerOrg, items: [{ p: products[1], qty: 40 }],                               status: "pending"  },
  ];

  for (let i = 0; i < b2bData.length; i++) {
    const { seller, buyer, items, status } = b2bData[i];
    const subtotal = items.reduce((s, it) => s + it.p.distributorPrice * it.qty, 0);
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
      unitPrice: it.p.distributorPrice,
      cost: it.p.cost,
      total: it.p.distributorPrice * it.qty,
    })));

    b2bOrders.push(order);
  }
  console.log(`  ${b2bOrders.length} B2B orders seeded`);

  // ── 13. Purchase Orders ─────────────────────────────────────────────────────
  console.log("\n[13] Purchase Orders");
  const poData = [
    { branch: hq,          supplier: sup1, items: [{ p: products[0], qty: 100, cost: products[0].cost }, { p: products[3], qty: 50, cost: products[3].cost }], status: "received" },
    { branch: northBranch, supplier: sup2, items: [{ p: products[6], qty: 80,  cost: products[6].cost }, { p: products[7], qty: 60, cost: products[7].cost }], status: "approved" },
    { branch: southBranch, supplier: sup3, items: [{ p: products[9], qty: 40,  cost: products[9].cost }, { p: products[11],qty: 30, cost: products[11].cost }], status: "submitted"},
    { branch: hq,          supplier: sup1, items: [{ p: products[1], qty: 120, cost: products[1].cost }], status: "draft"    },
  ];

  for (let i = 0; i < poData.length; i++) {
    const { branch, supplier, items, status } = poData[i];
    const subtotal = items.reduce((s, it) => s + it.cost * it.qty, 0);
    const poDate = new Date(Date.now() - (poData.length - i) * 10 * 86400000);

    const po = await PO.create({
      poNumber: `PO-${pad(i + 1)}`,
      branchId: branch._id,
      supplierId: supplier._id,
      status,
      subtotal,
      tax: 0,
      total: subtotal,
      notes: `Purchase order from ${supplier.name}`,
      expectedAt: new Date(poDate.getTime() + 7 * 86400000),
      receivedAt: status === "received" ? new Date(poDate.getTime() + 5 * 86400000) : null,
      createdBy: admin._id,
      createdAt: poDate,
    });

    await POItem.insertMany(items.map((it) => ({
      purchaseOrderId: po._id,
      productId: it.p._id,
      productName: it.p.name,
      sku: it.p.sku,
      quantityOrdered: it.qty,
      quantityReceived: status === "received" ? it.qty : 0,
      unitCost: it.cost,
      total: it.cost * it.qty,
    })));
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

  // ─── Summary ────────────────────────────────────────────────────────────────
  console.log("\n════════════════════════════════════════");
  console.log("  Seed Complete!");
  console.log("════════════════════════════════════════");
  console.log("\n  LOGIN CREDENTIALS");
  console.log("  ──────────────────────────────────────");
  console.log("  ADMIN");
  console.log("    Email:    admin@wise.com");
  console.log("    Password: admin123");
  console.log("\n  ORG ADMIN (Distributor)");
  console.log("    Email:    diego@wisedist.com");
  console.log("    Password: password123");
  console.log("\n  ORG ADMIN (Franchise)");
  console.log("    Email:    maria@brightlife.com");
  console.log("    Password: password123");
  console.log("\n  BRANCH MANAGER (HQ + North)");
  console.log("    Email:    carlos@wise.com");
  console.log("    Password: password123");
  console.log("\n  BRANCH MANAGER (South)");
  console.log("    Email:    ana@wise.com");
  console.log("    Password: password123");
  console.log("\n  STAFF");
  console.log("    Email:    rico@wise.com");
  console.log("    Password: password123");
  console.log("\n  INVENTORY MANAGER");
  console.log("    Email:    mark@wise.com");
  console.log("    Password: password123");
  console.log("════════════════════════════════════════\n");

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error("\nSeed failed:", err);
  process.exit(1);
});
