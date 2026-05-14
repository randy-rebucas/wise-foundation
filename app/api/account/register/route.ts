import { registerCustomerSchema } from "@/lib/validations/account.schema";
import { registerMarketplaceCustomer } from "@/lib/services/customerAccount.service";
import { errorResponse, successResponse } from "@/lib/utils/apiResponse";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = registerCustomerSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0]?.message ?? "Invalid input", 422);
    }

    await registerMarketplaceCustomer(parsed.data);
    return successResponse({ ok: true }, "Account created", 201);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Registration failed";
    if (msg.includes("already exists")) {
      return errorResponse(msg, 409);
    }
    return errorResponse(msg, 400);
  }
}
