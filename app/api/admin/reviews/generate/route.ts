import { connectDB } from "@/lib/db/connect";
import { User } from "@/lib/db/models/User";
import { Product } from "@/lib/db/models/Product";
import { withStaffAuth } from "@/lib/middleware/withStaffAuth";
import { withPermission } from "@/lib/middleware/withPermission";
import { successResponse, errorResponse, serverErrorResponse } from "@/lib/utils/apiResponse";
import type { AuthedRequest } from "@/lib/middleware/withAuth";
import mongoose from "mongoose";

const REVIEWER_POOL = [
  { name: "Maria Santos",     email: "maria.s@generated.glowish.demo" },
  { name: "Juan Reyes",       email: "juan.r@generated.glowish.demo" },
  { name: "Rosa Cruz",        email: "rosa.c@generated.glowish.demo" },
  { name: "Pedro Dela Cruz",  email: "pedro.d@generated.glowish.demo" },
  { name: "Ana Gonzalez",     email: "ana.g@generated.glowish.demo" },
  { name: "Miguel Torres",    email: "miguel.t@generated.glowish.demo" },
  { name: "Elena Ramos",      email: "elena.r@generated.glowish.demo" },
  { name: "Carlos Garcia",    email: "carlos.g@generated.glowish.demo" },
  { name: "Luz Mendoza",      email: "luz.m@generated.glowish.demo" },
  { name: "Jose Villanueva",  email: "jose.v@generated.glowish.demo" },
  { name: "Carla Flores",     email: "carla.f@generated.glowish.demo" },
  { name: "Ramon Aquino",     email: "ramon.a@generated.glowish.demo" },
  { name: "Sofia Lim",        email: "sofia.l@generated.glowish.demo" },
  { name: "Antonio Bautista", email: "antonio.b@generated.glowish.demo" },
  { name: "Teresa Navarro",   email: "teresa.n@generated.glowish.demo" },
];

type Cat = "homecare" | "cosmetics" | "wellness" | "scent";

const TEMPLATES: Record<Cat, Record<3 | 4 | 5, string[]>> = {
  homecare: {
    5: [
      "Absolutely love this! My skin has never felt softer. Will definitely keep buying.",
      "Best homecare product I've ever used. The scent is wonderful and lasts all day.",
      "Works amazingly well. I've recommended it to all my family members already.",
      "Great quality and very effective. Skin feels clean and moisturized every use.",
    ],
    4: [
      "Good product, does exactly what it promises. Will buy again for sure.",
      "Solid quality with a nice scent. A little pricey but worth it for the results.",
      "Happy with this purchase. Works well and packaging is neat.",
      "Good value for money. My skin feels noticeably cleaner after every use.",
    ],
    3: [
      "It's okay. Nothing extraordinary but gets the job done for daily use.",
      "Average product. Works fine but I expected a bit more for the price.",
      "Decent enough. Does what it says, though I've used better products before.",
      "Not bad. The scent is mild but the product itself is functional.",
    ],
  },
  cosmetics: {
    5: [
      "This has completely transformed my skin! I get compliments every single day now.",
      "Absolutely amazing product. Results are visible within just a few days.",
      "Best cosmetics purchase I've made this year. The formula is absolutely perfect.",
      "My skin looks so much better since I started using this. Highly recommend!",
    ],
    4: [
      "Great product overall. Exactly as described and the results are clearly visible.",
      "Good quality and nice packaging. Would definitely recommend to friends.",
      "Works well and feels great on the skin. Really happy with this purchase.",
      "Quality product. The formula is smooth and blends beautifully.",
    ],
    3: [
      "Decent product. Does what it claims but results are still subtle so far.",
      "It works, I just expected more noticeable results for the price.",
      "Okay product. Giving it more time before making a final judgment.",
      "Not bad but not my favorite either. Might try a different shade next time.",
    ],
  },
  wellness: {
    5: [
      "I've noticed a real difference in my energy and overall wellbeing. Amazing!",
      "Excellent supplement. Results are noticeable after just two weeks of use.",
      "This has become part of my daily routine. I feel so much better already.",
      "Great product. Easy to take and the benefits are real and noticeable.",
    ],
    4: [
      "Good supplement. Takes some time but it does work. Will continue using it.",
      "Quality product with good ingredients. I feel a difference after a month.",
      "Happy with this. Does what it says and the taste is manageable.",
      "Solid wellness product. Already reordered and plan to continue long-term.",
    ],
    3: [
      "Too early to judge but the product itself seems good quality. Will update.",
      "Alright product. The taste is a bit strong but I'm slowly getting used to it.",
      "Seems decent. Waiting another few weeks before drawing conclusions.",
      "Okay for now. Not sure if it's working yet but I'll keep taking it.",
    ],
  },
  scent: {
    5: [
      "This is now my signature scent! Long-lasting and I get compliments everywhere.",
      "Absolutely stunning fragrance. Worth every peso. Already buying my second bottle!",
      "The scent is divine and stays on all day. Exactly what I was looking for.",
      "Beautiful fragrance that gets better as the day goes on. Total love!",
    ],
    4: [
      "Lovely scent that lasts for several hours. Great choice for daily wear.",
      "Nice fragrance and elegant bottle design. Good longevity on the skin.",
      "Beautiful scent. Stays on for most of the day. Will definitely rebuy.",
      "Good fragrance at a reasonable price. Happy with the overall purchase.",
    ],
    3: [
      "Decent scent but fades a bit faster than expected. Still enjoyable though.",
      "The fragrance is pleasant but slightly different from what I imagined.",
      "Nice enough scent, could last longer. Good for casual everyday wear.",
      "Okay perfume. Not my favorite but wearable for daily use.",
    ],
  },
};

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const handler = async (_req: AuthedRequest) => {
  try {
    await connectDB();

    const products = await Product.find({
      marketplaceListed: true,
      isActive: true,
      deletedAt: null,
    })
      .select("_id name slug category")
      .lean();

    if (products.length === 0) {
      return errorResponse("No marketplace products found", 400);
    }

    // Build reviewer → accumulated reviews map
    const reviewerMap = new Map<
      string,
      { name: string; email: string; reviews: object[] }
    >();
    for (const r of REVIEWER_POOL) {
      reviewerMap.set(r.email, { ...r, reviews: [] });
    }

    let totalGenerated = 0;

    for (const product of products) {
      const count = Math.floor(Math.random() * 10) + 1; // 1–10 per product
      const reviewers = shuffle(REVIEWER_POOL).slice(
        0,
        Math.min(count, REVIEWER_POOL.length)
      );
      const cat = (product.category as Cat) ?? "homecare";
      const templates = TEMPLATES[cat] ?? TEMPLATES.homecare;

      for (const reviewer of reviewers) {
        const rating = (Math.floor(Math.random() * 3) + 3) as 3 | 4 | 5;
        reviewerMap.get(reviewer.email)!.reviews.push({
          id: new mongoose.Types.ObjectId().toString().slice(-12),
          productId: product._id.toString(),
          productName: product.name,
          productSlug: product.slug ?? "",
          rating,
          text: pick(templates[rating]),
          createdAt: new Date(
            Date.now() - (Math.floor(Math.random() * 90) + 1) * 86400000
          ).toISOString(),
        });
        totalGenerated++;
      }
    }

    // Replace previously generated reviewers so action is idempotent
    await User.deleteMany({ email: { $regex: /@generated\.glowish\.demo$/ } });

    const docs = Array.from(reviewerMap.values()).filter(
      (r) => r.reviews.length > 0
    );

    if (docs.length > 0) {
      await User.collection.insertMany(
        docs.map((r) => ({
          name: r.name,
          email: r.email,
          role: "CUSTOMER",
          isActive: true,
          emailVerified: true,
          deletedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          marketplace: {
            wishlist: [],
            savedAddresses: [],
            paymentMethods: [],
            reviews: r.reviews,
          },
        }))
      );
    }

    return successResponse({ generated: totalGenerated, products: products.length });
  } catch (err) {
    console.error("[admin/reviews/generate] POST error", err);
    return serverErrorResponse();
  }
};

export const POST = withStaffAuth(withPermission("manage:users")(handler));
