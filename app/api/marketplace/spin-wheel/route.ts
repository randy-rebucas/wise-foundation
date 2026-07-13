import { z } from "zod";
import { connectDB } from "@/lib/db/connect";
import { Coupon } from "@/lib/db/models/Coupon";
import { AppSettings } from "@/lib/db/models/AppSettings";
import { issueSpinCoupon } from "@/lib/services/coupon.service";
import { pickWeightedPrize } from "@/lib/constants/spinWheel";
import { enforceRateLimit } from "@/lib/utils/rateLimit";
import { errorResponse, successResponse } from "@/lib/utils/apiResponse";

const bodySchema = z.object({
  email: z.string().trim().email(),
});

export async function POST(req: Request) {
  const rateLimited = enforceRateLimit(req, "spin-wheel", { limit: 5, windowMs: 60_000 });
  if (rateLimited) return rateLimited;

  try {
    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0]?.message ?? "Invalid email", 422);
    }
    const email = parsed.data.email.toLowerCase();

    await connectDB();

    const existing = await Coupon.findOne({ source: "spin", customerEmail: email })
      .select("_id")
      .lean();
    if (existing) {
      return successResponse({ alreadySpun: true });
    }

    const settings = await AppSettings.findOne().sort({ _id: 1 }).lean();
    const freeGiftProductId = settings?.spinWheelFreeGiftProductId ?? null;

    const prize = pickWeightedPrize(!!freeGiftProductId);
    const coupon = await issueSpinCoupon(email, prize, freeGiftProductId);

    return successResponse({
      alreadySpun: false,
      prizeId: prize.id,
      prizeLabel: prize.label,
      couponCode: coupon.code,
      expiresAt: coupon.expiresAt,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not process spin";
    return errorResponse(msg, 400);
  }
}
