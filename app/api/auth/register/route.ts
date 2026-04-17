import { type NextRequest } from "next/server";
import { registerSchema } from "@/lib/validations/auth.schema";
import { registerTenantWithOwner } from "@/lib/services/auth.service";
import {
  successResponse,
  errorResponse,
  serverErrorResponse,
} from "@/lib/utils/apiResponse";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse(parsed.error.issues.map((e) => e.message).join(", "));
    }

    const result = await registerTenantWithOwner(parsed.data);

    return successResponse(result, "Organization registered successfully", 201);
  } catch (error) {
    if (error instanceof Error) {
      return errorResponse(error.message);
    }
    return serverErrorResponse();
  }
}
