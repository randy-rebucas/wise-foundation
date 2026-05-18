import {
  addCustomerSavedAddress,
  getCustomerSavedAddresses,
  removeCustomerSavedAddress,
  setCustomerDefaultAddress,
} from "@/lib/services/customerAccountData.service";
import { savedAddressSchema } from "@/lib/validations/customerAccount.schema";
import { errorResponse, successResponse } from "@/lib/utils/apiResponse";
import { requireCustomerSession } from "@/lib/utils/requireCustomerSession";

export async function GET() {
  const { error, session } = await requireCustomerSession();
  if (error) return error;
  try {
    const addresses = await getCustomerSavedAddresses(session!.user.id);
    return successResponse(addresses);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to load addresses";
    return errorResponse(msg, 500);
  }
}

export async function POST(req: Request) {
  const { error, session } = await requireCustomerSession();
  if (error) return error;
  try {
    const body = await req.json();
    const parsed = savedAddressSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues.map((e) => e.message).join(", "));
    }
    const addresses = await addCustomerSavedAddress(session!.user.id, parsed.data);
    return successResponse(addresses);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to save address";
    return errorResponse(msg, 500);
  }
}

export async function PATCH(req: Request) {
  const { error, session } = await requireCustomerSession();
  if (error) return error;
  try {
    const body = await req.json();
    const addressId = body.addressId as string | undefined;
    const action = body.action as string | undefined;
    if (!addressId) return errorResponse("addressId is required");
    if (action === "setDefault") {
      const addresses = await setCustomerDefaultAddress(session!.user.id, addressId);
      return successResponse(addresses);
    }
    return errorResponse("Unknown action");
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to update address";
    return errorResponse(msg, 500);
  }
}

export async function DELETE(req: Request) {
  const { error, session } = await requireCustomerSession();
  if (error) return error;
  try {
    const { searchParams } = new URL(req.url);
    const addressId = searchParams.get("id");
    if (!addressId) return errorResponse("id is required");
    const addresses = await removeCustomerSavedAddress(session!.user.id, addressId);
    return successResponse(addresses);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to remove address";
    return errorResponse(msg, 500);
  }
}
