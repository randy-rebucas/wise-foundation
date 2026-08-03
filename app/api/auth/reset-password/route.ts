import { resetPasswordWithToken } from "@/lib/services/user.service";
import { successResponse, errorResponse, serverErrorResponse } from "@/lib/utils/apiResponse";
import { z } from "zod";

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues.map((e) => e.message).join(", "));
    }

    const ok = await resetPasswordWithToken(parsed.data.token, parsed.data.password);
    if (!ok) {
      return errorResponse("This reset link is invalid or has expired.", 400);
    }

    return successResponse(null, "Password reset successfully. You can now sign in.");
  } catch {
    return serverErrorResponse();
  }
}
