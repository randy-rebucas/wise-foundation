import {
  addCustomerPaymentMethod,
  getCustomerPaymentMethods,
  removeCustomerPaymentMethod,
  setCustomerDefaultPaymentMethod,
} from "@/lib/services/customerAccountData.service";
import { paymentMethodSchema } from "@/lib/validations/customerAccount.schema";
import { errorResponse, successResponse } from "@/lib/utils/apiResponse";
import { requireCustomerSession } from "@/lib/utils/requireCustomerSession";

export async function GET() {
  const { error, session } = await requireCustomerSession();
  if (error) return error;
  try {
    const methods = await getCustomerPaymentMethods(session!.user.id);
    return successResponse(methods);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to load payment methods";
    return errorResponse(msg, 500);
  }
}

export async function POST(req: Request) {
  const { error, session } = await requireCustomerSession();
  if (error) return error;
  try {
    const body = await req.json();
    const parsed = paymentMethodSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues.map((e) => e.message).join(", "));
    }
    const methods = await addCustomerPaymentMethod(session!.user.id, parsed.data);
    return successResponse(methods);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to save payment method";
    return errorResponse(msg, 500);
  }
}

export async function PATCH(req: Request) {
  const { error, session } = await requireCustomerSession();
  if (error) return error;
  try {
    const body = await req.json();
    const methodId = body.methodId as string | undefined;
    if (!methodId) return errorResponse("methodId is required");
    const methods = await setCustomerDefaultPaymentMethod(session!.user.id, methodId);
    return successResponse(methods);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to update payment method";
    return errorResponse(msg, 500);
  }
}

export async function DELETE(req: Request) {
  const { error, session } = await requireCustomerSession();
  if (error) return error;
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return errorResponse("id is required");
    const methods = await removeCustomerPaymentMethod(session!.user.id, id);
    return successResponse(methods);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to remove payment method";
    return errorResponse(msg, 500);
  }
}
