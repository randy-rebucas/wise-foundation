import type { Metadata } from "next";
import Link from "next/link";
import { getPublicAppSettings } from "@/lib/services/appSettings.service";
import { buildPageMetadata } from "@/lib/seo/site";
import {
  MARKETPLACE_FLAT_SHIPPING_FEE,
  MARKETPLACE_FREE_SHIPPING_THRESHOLD,
} from "@/lib/utils/marketplaceShipping";
import {
  MarketplaceStaticPage,
  MarketplaceStaticSection,
} from "@/components/marketplace/MarketplaceStaticPage";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicAppSettings();
  return buildPageMetadata({
    title: "Shipping & Delivery",
    description: `Shipping options, delivery times, and fees for ${settings.appName} online orders.`,
    path: "/shipping-delivery",
    settings,
  });
}

export default function ShippingDeliveryPage() {
  return (
    <MarketplaceStaticPage
      eyebrow="Help"
      title="Shipping & delivery"
      subtitle="We ship nationwide across the Philippines. Rates and couriers are calculated at checkout based on your address, order weight, and payment method."
    >
      <MarketplaceStaticSection title="Free shipping">
        <p>
          Orders with a merchandise subtotal of{" "}
          <strong>₱{MARKETPLACE_FREE_SHIPPING_THRESHOLD.toLocaleString()}</strong> or more qualify
          for free standard shipping where available. Below that threshold, a flat shipping fee may
          apply (from ₱{MARKETPLACE_FLAT_SHIPPING_FEE} on cart preview; final amount confirmed at
          checkout).
        </p>
      </MarketplaceStaticSection>

      <MarketplaceStaticSection title="Delivery options">
        <p>At checkout you may see couriers such as:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>J&amp;T Express</strong> — economy delivery, typically 3–5 business days; COD may
            be available.
          </li>
          <li>
            <strong>Flash Express</strong> — standard delivery, typically 2–4 business days; COD may
            be available.
          </li>
          <li>
            <strong>Lalamove</strong> — same-day on-demand in Metro Manila; prepaid only.
          </li>
        </ul>
        <p>Exact options and fees depend on your city, region, and selected payment method.</p>
      </MarketplaceStaticSection>

      <MarketplaceStaticSection title="Processing time">
        <p>
          Orders are typically packed within 1–2 business days after payment confirmation. During
          peak seasons or promotions, allow an extra day. You will be notified if there is a delay.
        </p>
      </MarketplaceStaticSection>

      <MarketplaceStaticSection title="Cash on delivery (COD)">
        <p>
          Where COD is offered, please prepare the exact amount when possible. Failed delivery
          attempts due to incorrect address or unavailability may incur redelivery fees.
        </p>
      </MarketplaceStaticSection>

      <MarketplaceStaticSection title="Questions">
        <p>
          For order-specific shipping updates, check{" "}
          <Link href="/account/orders" className="font-medium text-[#6ea43f] hover:underline">
            your orders
          </Link>{" "}
          or{" "}
          <Link href="/contact" className="font-medium text-[#6ea43f] hover:underline">
            contact support
          </Link>
          .
        </p>
      </MarketplaceStaticSection>
    </MarketplaceStaticPage>
  );
}
