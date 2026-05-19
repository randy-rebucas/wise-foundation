import { withStaffAuth } from "@/lib/middleware/withStaffAuth";
import { connectDB } from "@/lib/db/connect";
import { User } from "@/lib/db/models/User";
import { serializeMeUser } from "@/lib/utils/serializeMeUser";
import { z } from "zod";
import {
  successResponse,
  errorResponse,
  serverErrorResponse,
} from "@/lib/utils/apiResponse";
import type { AuthedRequest } from "@/lib/middleware/withAuth";

const updateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z.string().optional(),
  avatar: z.string().url().optional(),
});

const getHandler = async (req: AuthedRequest) => {
  try {
    await connectDB();
    const user = await User.findOne({ _id: req.user.id, deletedAt: null })
      .select("-password")
      .populate({ path: "organizationId", select: "name" })
      .lean();
    if (!user) return errorResponse("User not found", 404);
    return successResponse(serializeMeUser(user as Record<string, unknown>));
  } catch {
    return serverErrorResponse();
  }
};

const patchHandler = async (req: AuthedRequest) => {
  try {
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues.map((e) => e.message).join(", "));
    }

    await connectDB();
    const user = await User.findOneAndUpdate(
      { _id: req.user.id, deletedAt: null },
      { $set: parsed.data },
      { new: true, runValidators: true }
    )
      .select("-password")
      .populate({ path: "organizationId", select: "name" })
      .lean();

    if (!user) return errorResponse("User not found", 404);
    return successResponse(serializeMeUser(user as Record<string, unknown>), "Profile updated");
  } catch {
    return serverErrorResponse();
  }
};

export const GET = withStaffAuth(getHandler);
export const PATCH = withStaffAuth(patchHandler);
