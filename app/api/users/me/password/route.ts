import bcrypt from "bcryptjs";
import { withAuth } from "@/lib/middleware/withAuth";
import { withTenant } from "@/lib/middleware/withTenant";
import { connectDB } from "@/lib/db/connect";
import { User } from "@/lib/db/models/User";
import { changePasswordSchema } from "@/lib/validations/auth.schema";
import {
  successResponse,
  errorResponse,
  serverErrorResponse,
} from "@/lib/utils/apiResponse";
import type { AuthedRequest } from "@/lib/middleware/withAuth";

const patchHandler = async (req: AuthedRequest) => {
  try {
    const body = await req.json();
    const parsed = changePasswordSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues.map((e) => e.message).join(", "));
    }

    await connectDB();
    const user = await User.findOne({ _id: req.user.id, deletedAt: null })
      .select("+password")
      .lean();

    if (!user) return errorResponse("User not found", 404);

    const isValid = await bcrypt.compare(parsed.data.currentPassword, user.password);
    if (!isValid) return errorResponse("Current password is incorrect");

    const hashed = await bcrypt.hash(parsed.data.newPassword, 12);
    await User.updateOne({ _id: req.user.id }, { $set: { password: hashed } });

    return successResponse(null, "Password changed successfully");
  } catch {
    return serverErrorResponse();
  }
};

export const PATCH = withAuth(withTenant(patchHandler));
