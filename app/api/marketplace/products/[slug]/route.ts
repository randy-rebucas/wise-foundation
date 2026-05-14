import { getMarketplaceProductBySlug } from "@/lib/services/marketplace.service";
import { errorResponse, notFoundResponse, serverErrorResponse, successResponse } from "@/lib/utils/apiResponse";

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await ctx.params;
    const product = await getMarketplaceProductBySlug(decodeURIComponent(slug));
    if (!product) return notFoundResponse("Product not found");
    return successResponse(product);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to load product";
    if (msg.includes("No branch")) return errorResponse(msg, 503);
    return serverErrorResponse(msg);
  }
}
