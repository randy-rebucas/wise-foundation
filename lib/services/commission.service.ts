import { connectDB } from "@/lib/db/connect";
import { Commission, type CommissionStatus } from "@/lib/db/models/Commission";

export async function getCommissions(opts: {
  organizationId?: string;
  status?: CommissionStatus;
  page?: number;
  limit?: number;
}) {
  await connectDB();
  const { organizationId, status, page = 1, limit = 20 } = opts;

  const filter: Record<string, unknown> = {};
  if (organizationId) filter.organizationId = organizationId;
  if (status) filter.status = status;

  const skip = (page - 1) * limit;
  const [records, total] = await Promise.all([
    Commission.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("organizationId", "name type commissionRate")
      .populate("orderId", "orderNumber total createdAt")
      .populate("paidBy", "name")
      .lean(),
    Commission.countDocuments(filter),
  ]);

  return { records, total, pages: Math.ceil(total / limit) };
}

export async function markCommissionPaid(id: string, userId: string, notes?: string) {
  await connectDB();
  const commission = await Commission.findById(id);
  if (!commission) throw new Error("Commission record not found");
  if (commission.status !== "pending") throw new Error("Only pending commissions can be marked paid");

  return Commission.findByIdAndUpdate(
    id,
    { $set: { status: "paid", paidAt: new Date(), paidBy: userId, notes: notes ?? commission.notes } },
    { new: true }
  ).lean();
}

export async function cancelCommission(id: string) {
  await connectDB();
  const commission = await Commission.findById(id);
  if (!commission) throw new Error("Commission record not found");
  if (commission.status === "paid") throw new Error("Paid commissions cannot be cancelled");

  return Commission.findByIdAndUpdate(
    id,
    { $set: { status: "cancelled" } },
    { new: true }
  ).lean();
}

export async function getCommissionSummary(organizationId?: string) {
  await connectDB();
  const match: Record<string, unknown> = {};
  if (organizationId) match.organizationId = organizationId;

  const [summary] = await Commission.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalEarned: { $sum: { $cond: [{ $in: ["$status", ["pending", "paid"]] }, "$amount", 0] } },
        totalPaid: { $sum: { $cond: [{ $eq: ["$status", "paid"] }, "$amount", 0] } },
        totalPending: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, "$amount", 0] } },
        count: { $sum: 1 },
      },
    },
  ]);

  return summary ?? { totalEarned: 0, totalPaid: 0, totalPending: 0, count: 0 };
}
