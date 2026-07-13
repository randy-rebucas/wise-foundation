import "dotenv/config";
import mongoose from "mongoose";
import { BlogPost } from "../lib/db/models/BlogPost";

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("MONGODB_URI is not set in .env.local");
  process.exit(1);
}

type SeedPost = {
  slug: string;
  title: string;
  summary: string;
  author: string;
  tags: string[];
  bodyMarkdown: string;
};

const POSTS: SeedPost[] = [
  {
    slug: "best-whitening-lotion-in-the-philippines",
    title: "Best Whitening Lotion in the Philippines (2026 Guide)",
    summary:
      "What actually makes a whitening lotion effective in Philippine heat and humidity, and how to pick one that brightens without damaging your skin barrier.",
    author: "Team",
    tags: ["skincare", "whitening", "guide"],
    bodyMarkdown: `Whitening — or more accurately, "brightening" — lotions are one of the most searched skincare categories in the Philippines, and for good reason: tropical sun exposure, pollution, and humidity all contribute to uneven skin tone and dark spots over time. But not all whitening lotions are created equal, and some of the harshest ones do more damage than good.

## What "whitening" actually means

Despite the name, a good whitening lotion doesn't bleach your skin. It works by:

- **Inhibiting melanin production** (the pigment responsible for dark spots and tan)
- **Gently exfoliating** dull, pigmented surface cells
- **Protecting against further darkening** from UV exposure

The best formulas do this while still hydrating and strengthening your skin barrier — not stripping it.

## What to look for on the label

1. **Niacinamide (Vitamin B3)** — brightens tone and fades dark spots without irritation, safe for daily use.
2. **Vitamin C derivatives** — antioxidant protection plus a visible glow boost.
3. **SPF 50+ PA++++** — non-negotiable in the Philippines. Whitening actives make your skin more sun-sensitive, and without sunscreen, any brightening gains get undone by the next tan.
4. **Alpha-arbutin or licorice extract** — gentler alternatives to older, harsher whitening agents like hydroquinone.

### What to avoid

Steer clear of products that promise "overnight whitening" or "permanent fairness" — these often rely on high-dose steroids or mercury, both banned by the FDA Philippines and genuinely harmful with long-term use. Always check that a product has an FDA Philippines Cosmetic Notification number before buying.

## Our pick

Our [GlowWish Whitening Serum Burst UV Lotion](/shop) combines SPF50+ PA++++ sun protection with brightening actives in one lightweight step — ideal for the Philippine climate where you need daily sun protection anyway. Pair it with a gentle cleanser and you've got a complete brightening routine without extra steps.

## The realistic timeline

Most brightening ingredients take **4 to 8 weeks of consistent use** to show visible results. Skin cell turnover simply doesn't happen faster than that, no matter what a product claims. Be patient, apply sunscreen religiously, and you'll see gradual, even brightening — the kind that actually lasts.`,
  },
  {
    slug: "how-to-remove-body-odor-naturally",
    title: "How to Remove Body Odor Naturally",
    summary:
      "Body odor isn't about sweat — it's about bacteria. Here's what causes it and natural ways to manage it, especially in humid weather.",
    author: "Team",
    tags: ["wellness", "body-care", "guide"],
    bodyMarkdown: `Sweat itself is odorless. Body odor happens when bacteria on your skin break down the proteins and fatty acids in sweat — particularly in warm, moist areas like the underarms. In the Philippines' heat and humidity, this process happens faster and more often, which is why body odor management matters more here than in cooler climates.

## Why some people are more prone to it

- **Apocrine sweat glands** (concentrated in the underarms and groin) produce a thicker, protein-rich sweat that bacteria feed on more easily than regular sweat.
- **Diet** — foods high in sulfur (garlic, onions, red meat) and alcohol can intensify odor as they're metabolized.
- **Certain fabrics** — synthetic fabrics trap moisture and bacteria against the skin longer than breathable cotton.

## Natural ways to manage it

### 1. Wash with an antibacterial or tea tree soap
Reducing the bacterial population on your skin is the single most effective thing you can do — more effective than masking odor with fragrance alone.

### 2. Apply diluted apple cider vinegar or witch hazel
Both lower the skin's pH, making it a less hospitable environment for odor-causing bacteria. Apply with a cotton pad after showering and let it dry before dressing.

### 3. Use a mineral-based (alum) deodorant
Alum crystal deodorants work by creating a thin antibacterial layer on the skin, without blocking pores the way some antiperspirants do.

### 4. Change your diet gradually
Cutting back on processed foods, excess red meat, and alcohol — and drinking more water — noticeably reduces body odor intensity for many people within a couple of weeks.

### 5. Choose breathable fabrics
Cotton and linen let sweat evaporate instead of sitting on the skin. If you sweat heavily, bring a change of shirt for humid afternoons.

## When it's more than odor

Sudden, unusually strong body odor changes can sometimes signal an underlying health issue (thyroid changes, diabetes, or diet shifts). If natural methods aren't helping after a few weeks, it's worth a quick chat with a doctor rather than just reaching for stronger antiperspirants.

## The bottom line

Body odor control is mostly about **bacteria management, not just sweat control**. A gentle antibacterial wash, breathable fabrics, and a natural deodorant will get most people most of the way there — no harsh aluminum-heavy antiperspirants required.`,
  },
  {
    slug: "difference-between-fabric-conditioner-and-softener",
    title: "Difference Between Fabric Conditioner and Softener",
    summary:
      "\"Fabric conditioner\" and \"fabric softener\" are often used interchangeably in the Philippines — here's what actually separates them, and which one your laundry needs.",
    author: "Team",
    tags: ["homecare", "laundry", "guide"],
    bodyMarkdown: `Walk down any supermarket aisle in the Philippines and you'll see "fabric conditioner" and "fabric softener" used almost interchangeably on product labels. In practice, most products sold locally today combine both functions — but understanding the difference helps you pick the right one for your laundry needs.

## Fabric softener: the original purpose

Traditional fabric **softeners** work through a simple mechanical/chemical process: they coat fibers with a thin layer of lubricating agents (often cationic surfactants) that reduce friction between fibers. This is what makes towels fluffier and shirts feel less stiff after air-drying.

**What it does well:**
- Reduces stiffness from air-drying or hard water
- Minimizes static cling
- Makes fibers feel smoother to the touch

**What it doesn't do:**
- Doesn't necessarily leave a lasting scent
- Can build up on fabric over time, reducing towel absorbency

## Fabric conditioner: softening plus fiber care

A fabric **conditioner** is generally a more advanced formula. In addition to the softening agents, it typically includes:

- **Fiber-care ingredients** that help maintain fabric shape and reduce pilling over repeated washes
- **Long-lasting fragrance technology** (microcapsules that release scent gradually, even hours after the fabric is dry)
- Sometimes **color-protecting** or **anti-wrinkle** additives

Think of "conditioner" the same way you'd think of hair conditioner versus a basic detangler — it's doing more than just softening; it's caring for the fiber long-term.

## Does it matter which one you buy?

For most Filipino households doing everyday laundry, the practical difference is small — most retail products labeled either way perform similarly. What matters more:

1. **Match it to your fabric type.** Skip softener on activewear, microfiber towels, and flame-resistant clothing — the coating reduces moisture-wicking and absorbency.
2. **Don't overdose.** More product doesn't mean softer clothes — it just means buildup, which can actually make towels less absorbent over time.
3. **Add it at the right point.** In a top-load wash, add during the rinse cycle, not with the detergent — mixing the two can cancel out both products' effectiveness.

## Our take

If you want scent longevity, pick a "conditioner" formula. If you're just after softness and reduced static on a budget, a basic "softener" does the job. Either way, use it sparingly on towels and activewear so you don't sacrifice absorbency for softness.`,
  },
  {
    slug: "how-to-build-a-daily-skincare-routine",
    title: "How to Build a Daily Skincare Routine (That You'll Actually Stick To)",
    summary:
      "You don't need ten products. Here's a realistic, budget-friendly morning and night skincare routine that works for most skin types in the Philippines.",
    author: "Team",
    tags: ["skincare", "routine", "guide"],
    bodyMarkdown: `The biggest reason skincare routines fail isn't the products — it's that they're too complicated to maintain. A 3-step routine you actually do every day beats a 10-step routine you abandon after two weeks. Here's a realistic framework.

## The morning routine (protect)

1. **Cleanse** — A gentle, low-pH cleanser to remove overnight oil buildup without stripping your skin. If your skin isn't oily, splashing with water alone is sometimes enough.
2. **Treat (optional)** — A lightweight serum for your specific concern: vitamin C for brightening, niacinamide for oil control and tone, hyaluronic acid for hydration.
3. **Moisturize** — Even oily skin needs moisture; skipping this step often triggers *more* oil production to compensate.
4. **Sunscreen — always** — This is the single most important step for preventing premature aging, dark spots, and sun damage. SPF50+ PA++++ is ideal for Philippine sun exposure, reapplied every 3–4 hours if you're outdoors.

## The night routine (repair)

1. **Double cleanse if you wore sunscreen or makeup** — an oil-based cleanser first to break down SPF/makeup, then your regular cleanser.
2. **Treat** — This is when to use stronger actives (retinoids, exfoliating acids) since they can increase sun sensitivity — night use avoids that risk.
3. **Moisturize** — A slightly richer formula than your daytime moisturizer helps lock in hydration overnight while skin repairs itself.

## Building it up gradually

Don't introduce more than one new active ingredient at a time. Wait 1–2 weeks between additions so you can tell what's working — and what's causing irritation — before adding the next step.

**A realistic 4-week build-up:**
- **Week 1:** Cleanser + moisturizer + SPF (AM), cleanser + moisturizer (PM)
- **Week 2:** Add a hydrating serum (AM or PM)
- **Week 3:** Add a treatment serum for your main concern (brightening, oil control, etc.)
- **Week 4:** Add a weekly exfoliant (1–2x/week only, not daily)

## Common mistakes to avoid

- **Over-exfoliating** — more than 2–3x per week for most skin types damages your barrier rather than improving texture.
- **Skipping sunscreen on cloudy days** — UV rays pass through clouds; daily SPF matters regardless of weather.
- **Mixing too many actives at once** — retinoids + strong acids together often cause irritation. Introduce one at a time.
- **Switching products too fast** — most skincare needs 4–6 weeks of consistent use before you can judge if it's working.

## The bottom line

A sustainable routine beats a perfect one. Start with cleanser, moisturizer, and sunscreen — that alone covers 80% of what skin needs. Add treatments gradually as your skin (and your budget) allows.`,
  },
  {
    slug: "best-perfume-under-500-pesos",
    title: "Best Perfume Under ₱500",
    summary:
      "Great-smelling, long-lasting perfume doesn't have to be expensive. Here's how to find quality fragrances under ₱500 — and what to check before you buy.",
    author: "Team",
    tags: ["fragrance", "budget", "guide"],
    bodyMarkdown: `A common myth is that you need to spend a few thousand pesos to smell good. In reality, fragrance price is driven as much by branding and packaging as it is by the actual juice inside the bottle — which means there's real quality to be found under ₱500 if you know what to look for.

## What actually determines quality (not just price)

1. **Concentration** — Look at the label for Eau de Parfum (EDP, ~15–20% fragrance oil) vs Eau de Toilette (EDT, ~5–15%) vs Eau de Cologne (EDC, ~2–4%). Higher concentration means longer wear time and less need to reapply — often more cost-effective per use even at a similar price point.
2. **Note structure** — Good perfumes are built in layers: top notes (first impression, fades in minutes), heart/middle notes (the main character, lasts hours), and base notes (the lingering scent, can last all day). A well-balanced budget fragrance will still have a clear structure rather than smelling flat or one-dimensional.
3. **Longevity and sillage** — How long it lasts and how far it projects. This varies by skin chemistry, so patterns from reviews are a guide, not a guarantee.

## Tips for making a budget fragrance last longer

- **Apply to pulse points** — wrists, neck, behind the ears — where body heat helps the scent diffuse throughout the day.
- **Moisturize skin first** — fragrance clings to hydrated skin far better than dry skin, extending wear time significantly.
- **Don't rub your wrists together** after applying — this breaks down the top notes faster and can distort the scent.
- **Store it properly** — away from direct sunlight and heat, which degrade fragrance oils over time (a common reason budget perfumes get an undeserved reputation for not lasting).

## What to check before buying

- **FDA Philippines registration** — legitimate fragrance brands sold locally should have proper cosmetic notification.
- **Batch code / manufacturing date** — fragrances do expire; fresher stock smells truer to the original formula.
- **Reviews from people with similar skin type** — sillage and longevity vary a lot person to person, so patterns across multiple reviews are more reliable than a single glowing description.

## Our pick

Browse our [fragrance collection](/shop?category=scent) for EDP-concentration options priced under ₱500 — a sweet spot for everyday wear without the luxury markup. Layer with an unscented lotion for even longer-lasting wear throughout a humid day.

## The bottom line

Price alone doesn't determine how good a fragrance is or how long it lasts. Concentration, application technique, and proper storage matter just as much — sometimes more — than the number on the price tag.`,
  },
];

async function main() {
  await mongoose.connect(MONGODB_URI!);
  console.log("Connected to MongoDB");

  for (const post of POSTS) {
    const now = new Date();
    const result = await BlogPost.findOneAndUpdate(
      { slug: post.slug },
      {
        $set: {
          title: post.title,
          summary: post.summary,
          author: post.author,
          tags: post.tags,
          bodyMarkdown: post.bodyMarkdown,
          isPublished: true,
        },
        $setOnInsert: {
          slug: post.slug,
          publishedAt: now,
          deletedAt: null,
        },
      },
      { upsert: true, new: true }
    );
    console.log(`Upserted: ${result.slug} (${result._id})`);
  }

  await mongoose.disconnect();
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
