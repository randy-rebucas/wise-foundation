import {
  addCustomerWishlistItem,
  getCustomerWishlist,
  removeCustomerWishlistItem,
} from "@/lib/services/customerAccountData.service";
import { wishlistItemSchema } from "@/lib/validations/customerAccount.schema";
import { errorResponse, successResponse } from "@/lib/utils/apiResponse";
import { requireCustomerSession } from "@/lib/utils/requireCustomerSession";

export async function GET() {
  const { error, session } = await requireCustomerSession();
  if (error) return error;
  try {
    const items = await getCustomerWishlist(session!.user.id);
    return successResponse(items);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to load wishlist";
    return errorResponse(msg, 500);
  }
}

export async function POST(req: Request) {
  const { error, session } = await requireCustomerSession();
  if (error) return error;
  try {
    const body = await req.json();
    const parsed = wishlistItemSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues.map((e) => e.message).join(", "));
    }
    const items = await addCustomerWishlistItem(session!.user.id, parsed.data);
    return successResponse(items);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to update wishlist";
    return errorResponse(msg, 500);
  }
}

export async function DELETE(req: Request) {
  const { error, session } = await requireCustomerSession();
  if (error) return error;
  try {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId");
    const variantId = searchParams.get("variantId");
    if (!productId) return errorResponse("productId is required");
    const items = await removeCustomerWishlistItem(
      session!.user.id,
      productId,
      variantId === "null" || !variantId ? null : variantId
    );
    return successResponse(items);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to update wishlist";
    return errorResponse(msg, 500);
  }
}
