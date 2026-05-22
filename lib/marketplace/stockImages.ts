/** Fallback Unsplash URLs when no listed product image exists for a category. */
export const MARKETPLACE_STOCK_IMAGES = {
  cleanser:
    "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80",
  serum:
    "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=800&q=80",
  collection:
    "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=800&q=80",
  moisturizer:
    "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&fit=crop&w=800&q=80",
  botanical:
    "https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=900&q=80",
  lifestyle:
    "https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=1200&q=80",
} as const;

/** Portrait stock for testimonial sections on marketing pages. */
export const MARKETPLACE_STOCK_AVATARS = [
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80",
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=200&q=80",
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80",
  "https://images.unsplash.com/photo-1502685104226-ee32379fefbe?auto=format&fit=crop&w=200&q=80",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
] as const;

export const MARKETPLACE_PRODUCT_STOCK = [
  MARKETPLACE_STOCK_IMAGES.cleanser,
  MARKETPLACE_STOCK_IMAGES.serum,
  MARKETPLACE_STOCK_IMAGES.collection,
  MARKETPLACE_STOCK_IMAGES.moisturizer,
] as const;
