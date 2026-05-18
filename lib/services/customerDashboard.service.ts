import mongoose from "mongoose";
import { connectDB } from "@/lib/db/connect";
import { User } from "@/lib/db/models/User";
import { getPublicAppSettings } from "@/lib/services/appSettings.service";
import {
  listMyMarketplaceOrders,
  type CustomerOrderRow,
} from "@/lib/services/customerOrders.service";
import {
  PREMIUM_ORDER_COUNT,
  PREMIUM_POINTS_THRESHOLD,
  PREMIUM_SPEND_THRESHOLD,
} from "@/lib/types/customerAccount";
import type { OrderStatus, UserRole } from "@/types";

const PAID_STATUSES: OrderStatus[] = ["paid", "delivered", "completed", "approved"];

export type CustomerDashboardProfile = {
  name: string;
  email: string;
  phone: string | null;
  avatar: string | null;
  role: UserRole;
  memberSince: string;
};

export type CustomerDashboardData = {
  profile: CustomerDashboardProfile;
  orders: CustomerOrderRow[];
  rewardPoints: number;
  memberDiscountPercent: number;
  accountStatusLabel: string;
  isPremiumMember: boolean;
};

export function calculateRewardPoints(orders: CustomerOrderRow[]): number {
  return orders
    .filter((o) => PAID_STATUSES.includes(o.status))
    .reduce((sum, o) => sum + Math.floor(o.total), 0);
}

function paidOrderSpend(orders: CustomerOrderRow[]) {
  const paid = orders.filter((o) => PAID_STATUSES.includes(o.status));
  const spend = paid.reduce((sum, o) => sum + o.total, 0);
  return { paidCount: paid.length, spend };
}

export function resolveAccountStatus(
  role: UserRole,
  orders: CustomerOrderRow[]
): { label: string; isPremiumMember: boolean } {
  if (role === "MEMBER") {
    return { label: "Member", isPremiumMember: true };
  }

  const { paidCount, spend } = paidOrderSpend(orders);
  if (
    paidCount >= PREMIUM_ORDER_COUNT ||
    spend >= PREMIUM_SPEND_THRESHOLD ||
    calculateRewardPoints(orders) >= PREMIUM_POINTS_THRESHOLD
  ) {
    return { label: "Premium Member", isPremiumMember: true };
  }
  if (paidCount >= 1) {
    return { label: "Active Customer", isPremiumMember: false };
  }
  return { label: "New Customer", isPremiumMember: false };
}

export async function getCustomerDashboard(userId: string): Promise<CustomerDashboardData | null> {
  await connectDB();
  if (!mongoose.isValidObjectId(userId)) return null;

  const [user, orders, settings] = await Promise.all([
    User.findOne({ _id: userId, deletedAt: null })
      .select("name email phone avatar role createdAt")
      .lean(),
    listMyMarketplaceOrders(userId),
    getPublicAppSettings(),
  ]);

  if (!user) return null;

  const role = user.role as UserRole;
  const { label, isPremiumMember } = resolveAccountStatus(role, orders);

  return {
    profile: {
      name: user.name,
      email: user.email,
      phone: user.phone ?? null,
      avatar: user.avatar ?? null,
      role,
      memberSince: (user.createdAt as Date).toISOString(),
    },
    orders,
    rewardPoints: calculateRewardPoints(orders),
    memberDiscountPercent: settings.memberDefaultDiscountPercent,
    accountStatusLabel: label,
    isPremiumMember,
  };
}
