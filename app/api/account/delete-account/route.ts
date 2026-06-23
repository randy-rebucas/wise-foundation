import { connectDB } from "@/lib/db/connect";
import { User } from "@/lib/db/models/User";
import { withCustomerRoute, errorResponse, successResponse } from "@/lib/utils/withCustomerRoute";
import { writeAuditLog } from "@/lib/services/audit.service";

export const DELETE = withCustomerRoute(async (userId, req) => {
  const body = (await req.json().catch(() => ({}))) as { confirm?: unknown };
  if (body.confirm !== true) {
    return errorResponse('Body must include "confirm": true to proceed with account deletion');
  }

  await connectDB();

  const user = await User.findOne({ _id: userId, deletedAt: null });
  if (!user) return errorResponse("Account not found", 404);

  // Anonymise PII rather than hard-delete so order records remain coherent.
  await User.updateOne(
    { _id: userId },
    {
      $set: {
        name: "Deleted Account",
        email: `deleted+${userId}@deleted.invalid`,
        phone: null,
        avatar: null,
        isActive: false,
        deletedAt: new Date(),
        emailVerified: false,
        emailVerificationToken: null,
        emailVerificationExpiry: null,
        "marketplace.savedAddresses": [],
        "marketplace.paymentMethods": [],
        "marketplace.wishlist": [],
      },
    }
  );

  void writeAuditLog({
    action: "user.account_deleted",
    actor: { id: userId, name: user.name },
    targetId: userId,
    targetType: "User",
  });

  return successResponse(null, "Account deleted. Your personal data has been removed.");
});
