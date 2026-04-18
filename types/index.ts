import { Types } from "mongoose";

// ─── Enums ──────────────────────────────────────────────────────────────────

export type UserRole =
  | "ADMIN"
  | "BRANCH_MANAGER"
  | "STAFF"
  | "INVENTORY_MANAGER"
  | "MEMBER";

export type ProductCategory = "homecare" | "cosmetics" | "wellness" | "scent";

export type StockMovementType = "IN" | "OUT" | "TRANSFER" | "ADJUSTMENT";

export type OrderType = "POS" | "BULK" | "DISTRIBUTOR";

export type OrderStatus = "pending" | "paid" | "completed" | "cancelled" | "refunded";

export type MemberStatus = "active" | "inactive" | "suspended";

export type PurchaseOrderStatus = "draft" | "submitted" | "approved" | "received" | "cancelled";

// ─── API Response ────────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    hasMore?: boolean;
    totalPages?: number;
  };
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface JWTPayload {
  userId: string;
  role: UserRole;
  branchIds: string[];
  permissions: string[];
}

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  branchIds: string[];
  permissions: string[];
  image?: string;
}

// ─── Shared Base ─────────────────────────────────────────────────────────────

export interface BaseDocument {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

// ─── Cart (Zustand) ───────────────────────────────────────────────────────────

export interface CartItem {
  productId: string;
  variantId?: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  image?: string;
  maxStock: number;
}

export interface CartState {
  items: CartItem[];
  memberId: string | null;
  memberName: string | null;
  discountPercent: number;
  branchId: string;
  addItem: (item: Omit<CartItem, "quantity">) => void;
  removeItem: (productId: string, variantId?: string) => void;
  updateQuantity: (productId: string, quantity: number, variantId?: string) => void;
  setMember: (memberId: string | null, memberName: string | null, discount: number) => void;
  clearCart: () => void;
  getSubtotal: () => number;
  getDiscount: () => number;
  getTotal: () => number;
}
