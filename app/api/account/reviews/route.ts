import { addCustomerReview, getCustomerReviews } from "@/lib/services/customerAccountData.service";
import { customerReviewSchema } from "@/lib/validations/customerAccount.schema";
import { errorResponse, successResponse } from "@/lib/utils/apiResponse";
import { requireCustomerSession } from "@/lib/utils/requireCustomerSession";

export async function GET() {
  const { error, session } = await requireCustomerSession();
  if (error) return error;
  try {
    const reviews = await getCustomerReviews(session!.user.id);
    return successResponse(reviews);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to load reviews";
    return errorResponse(msg, 500);
  }
}

export async function POST(req: Request) {
  const { error, session } = await requireCustomerSession();
  if (error) return error;
  try {
    const body = await req.json();
    const parsed = customerReviewSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues.map((e) => e.message).join(", "));
    }
    const reviews = await addCustomerReview(session!.user.id, parsed.data);
    return successResponse(reviews);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to save review";
    return errorResponse(msg, 400);
  }
}
