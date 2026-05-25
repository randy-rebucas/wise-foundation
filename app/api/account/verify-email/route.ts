import { NextRequest } from "next/server";
import { verifyEmailToken } from "@/lib/services/customerAccount.service";
import { errorResponse, successResponse } from "@/lib/utils/apiResponse";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token?.trim()) {
    return errorResponse("Verification token is required", 400);
  }

  const ok = await verifyEmailToken(token.trim());
  if (!ok) {
    return errorResponse("Invalid or expired verification link", 400);
  }

  return successResponse(null, "Email verified successfully");
}
