import type { Metadata } from "next";
import Link from "next/link";
import { getPublicAppSettings } from "@/lib/services/appSettings.service";
import { buildPageMetadata } from "@/lib/seo/site";
import {
  MarketplaceStaticPage,
  MarketplaceStaticSection,
} from "@/components/marketplace/MarketplaceStaticPage";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicAppSettings();
  return buildPageMetadata({
    title: "FAQs",
    description: `Frequently asked questions about shopping, orders, and products at ${settings.appName}.`,
    path: "/faqs",
    settings,
  });
}

const FAQ_ITEMS = [
  {
    q: "How do I place an order?",
    a: "Browse the shop, add items to your cart, and complete checkout with your shipping address and payment method. You will receive an order confirmation once payment is successful.",
  },
  {
    q: "Can I change or cancel my order?",
    a: "Contact us as soon as possible if you need to change or cancel an order. We can only modify orders that have not yet been packed for shipment.",
  },
  {
    q: "Which payment methods do you accept?",
    a: "Available methods are shown at checkout and may include card, GCash, cash on delivery (where offered), and bank transfer depending on your region and order total.",
  },
  {
    q: "Are your products safe for sensitive skin?",
    a: "Our formulas are developed for gentle daily use. If you have sensitivities or allergies, review ingredient lists on each product page and patch-test before full use.",
  },
  {
    q: "How do I track my delivery?",
    a: "Signed-in customers can view order status under Account → Orders. You will also receive updates by email when your order ships, when available.",
  },
  {
    q: "Do you offer member or wholesale pricing?",
    a: "Promotions and member benefits may apply at participating locations or accounts. For wholesale inquiries, use our contact page and our team will respond.",
  },
];

export default function FaqsPage() {
  return (
    <MarketplaceStaticPage
      eyebrow="Help"
      title="Frequently asked questions"
      subtitle="Quick answers about shopping, orders, payments, and product care. Still need help? Our support team is happy to assist."
    >
      <div className="space-y-4">
        {FAQ_ITEMS.map((item) => (
          <details
            key={item.q}
            className="group rounded-2xl border border-white/70 bg-white/50 px-5 py-4 open:shadow-sm"
          >
            <summary className="cursor-pointer list-none font-semibold text-[#1e3157] marker:content-none [&::-webkit-details-marker]:hidden">
              <span className="flex items-center justify-between gap-3">
                {item.q}
                <span className="text-[#6ea43f] text-lg leading-none group-open:rotate-45 transition-transform">
                  +
                </span>
              </span>
            </summary>
            <p className="mt-3 text-sm leading-7 text-[#2A4C6A]/90">{item.a}</p>
          </details>
        ))}
      </div>

      <MarketplaceStaticSection title="More help">
        <p>
          Read our{" "}
          <Link href="/shipping-delivery" className="font-medium text-[#6ea43f] hover:underline">
            Shipping &amp; Delivery
          </Link>{" "}
          and{" "}
          <Link href="/returns-refunds" className="font-medium text-[#6ea43f] hover:underline">
            Returns &amp; Refunds
          </Link>{" "}
          policies, or{" "}
          <Link href="/contact" className="font-medium text-[#6ea43f] hover:underline">
            contact us
          </Link>{" "}
          directly.
        </p>
      </MarketplaceStaticSection>
    </MarketplaceStaticPage>
  );
}
