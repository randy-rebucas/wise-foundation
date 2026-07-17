import "dotenv/config";
import mongoose from "mongoose";
import { Product } from "../lib/db/models/Product";
import { User } from "../lib/db/models/User";
import { BlogPost } from "../lib/db/models/BlogPost";

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("MONGODB_URI is not set in .env.local");
  process.exit(1);
}

const DRY_RUN = process.argv.includes("--dry");

/** Display text: any casing/spacing variant of the misspelling → "Glowish". */
function fixText(value: string): string {
  return value.replace(/glow\s*wish/gi, "Glowish");
}

/** Slugs are lowercase; keep the replacement lowercase. */
function fixSlug(value: string): string {
  return value.replace(/glowwish/g, "glowish");
}

const MATCH = /glow\s*wish/i;

const PRODUCT_TEXT_FIELDS = [
  "name",
  "shortDescription",
  "description",
  "seoTitle",
  "seoDescription",
] as const;

async function migrateProducts(slugMap: Map<string, string>) {
  const products = await Product.find({
    $or: [
      ...PRODUCT_TEXT_FIELDS.map((f) => ({ [f]: MATCH })),
      { tags: MATCH },
      { slug: /glowwish/ },
    ],
  });

  let changed = 0;
  for (const product of products) {
    const updates: Record<string, unknown> = {};

    for (const field of PRODUCT_TEXT_FIELDS) {
      const current = product[field];
      if (typeof current === "string" && MATCH.test(current)) {
        updates[field] = fixText(current);
      }
    }

    if (Array.isArray(product.tags) && product.tags.some((t: string) => MATCH.test(t))) {
      updates.tags = product.tags.map((t: string) => fixText(t));
    }

    if (/glowwish/.test(product.slug)) {
      let nextSlug = fixSlug(product.slug);
      // Slug is unique among non-deleted products — avoid collisions.
      let suffix = 2;
      while (
        await Product.exists({
          slug: nextSlug,
          deletedAt: null,
          _id: { $ne: product._id },
        })
      ) {
        nextSlug = `${fixSlug(product.slug)}-${suffix++}`;
      }
      updates.slug = nextSlug;
      slugMap.set(product.slug, nextSlug);
    }

    if (Object.keys(updates).length === 0) continue;
    changed++;
    console.log(
      `product ${product.sku}: ${Object.keys(updates).join(", ")}` +
        (updates.name ? ` → "${updates.name}"` : "") +
        (updates.slug ? ` (slug: ${product.slug} → ${updates.slug})` : "")
    );
    if (!DRY_RUN) {
      await Product.updateOne({ _id: product._id }, { $set: updates });
    }
  }
  return changed;
}

async function migrateReviews(slugMap: Map<string, string>) {
  const users = await User.find({
    $or: [
      { "marketplace.reviews.productName": MATCH },
      { "marketplace.reviews.productSlug": /glowwish/ },
      { "marketplace.reviews.text": MATCH },
    ],
  });

  let changedReviews = 0;
  for (const user of users) {
    const reviews = user.marketplace?.reviews ?? [];
    let touched = false;
    for (const review of reviews) {
      let reviewTouched = false;
      if (typeof review.productName === "string" && MATCH.test(review.productName)) {
        review.productName = fixText(review.productName);
        reviewTouched = true;
      }
      if (typeof review.productSlug === "string" && /glowwish/.test(review.productSlug)) {
        review.productSlug = slugMap.get(review.productSlug) ?? fixSlug(review.productSlug);
        reviewTouched = true;
      }
      if (typeof review.text === "string" && MATCH.test(review.text)) {
        review.text = fixText(review.text);
        reviewTouched = true;
      }
      if (reviewTouched) {
        touched = true;
        changedReviews++;
      }
    }
    if (touched) {
      console.log(`user ${user.email}: updated review snapshot(s)`);
      if (!DRY_RUN) {
        await User.updateOne(
          { _id: user._id },
          { $set: { "marketplace.reviews": reviews } }
        );
      }
    }
  }
  return changedReviews;
}

async function migrateBlogPosts() {
  const posts = await BlogPost.find({
    $or: [{ title: MATCH }, { summary: MATCH }, { bodyMarkdown: MATCH }],
  });

  let changed = 0;
  for (const post of posts) {
    const updates: Record<string, string> = {};
    for (const field of ["title", "summary", "bodyMarkdown"] as const) {
      const current = post[field];
      if (typeof current === "string" && MATCH.test(current)) {
        updates[field] = fixText(current);
      }
    }
    if (Object.keys(updates).length === 0) continue;
    changed++;
    console.log(`blog post ${post.slug}: ${Object.keys(updates).join(", ")}`);
    if (!DRY_RUN) {
      await BlogPost.updateOne({ _id: post._id }, { $set: updates });
    }
  }
  return changed;
}

async function run() {
  await mongoose.connect(MONGODB_URI as string);
  console.log(DRY_RUN ? "DRY RUN — no writes will be made\n" : "Migrating GlowWish → Glowish\n");

  const slugMap = new Map<string, string>();
  const products = await migrateProducts(slugMap);
  const reviews = await migrateReviews(slugMap);
  const posts = await migrateBlogPosts();

  console.log(
    `\nSummary${DRY_RUN ? " (dry run)" : ""}: ${products} product(s), ${reviews} review snapshot(s), ${posts} blog post(s) updated.`
  );

  // Historical snapshots (order items, purchase orders, abandoned checkouts) are
  // intentionally left untouched — they record what was sold at the time.
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
