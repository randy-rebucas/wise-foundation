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
    title: "Returns & Refunds",
    description: `Return and refund policy for ${settings.appName} online purchases.`,
    path: "/returns-refunds",
    settings,
  });
}

export default function ReturnsRefundsPage() {
  return (
    <MarketplaceStaticPage
      eyebrow="Help"
      title="Returns & refunds"
      subtitle="We want you to love your purchase. If something is not right, review the guidelines below and reach out within the stated window."
    >
      <MarketplaceStaticSection title="Eligibility">
        <p>You may request a return or exchange when:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>The item is unused, unopened, and in original packaging (seals intact where applicable).</li>
          <li>You contact us within <strong>7 days</strong> of delivery.</li>
          <li>The product is defective, damaged in transit, or incorrect (we will verify with photos).</li>
        </ul>
        <p>
          For hygiene reasons, opened skincare testers, used applicators, or personalized items may not
          be eligible unless defective.
        </p>
      </MarketplaceStaticSection>

      <MarketplaceStaticSection title="How to start a return">
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            Email or message us via{" "}
            <Link href="/contact" className="font-medium text-[#6ea43f] hover:underline">
              Contact
            </Link>{" "}
            with your order number and reason.
          </li>
          <li>Include clear photos of the product and packaging if damaged or incorrect.</li>
          <li>Wait for return instructions and authorization—do not send items without approval.</li>
        </ol>
      </MarketplaceStaticSection>

      <MarketplaceStaticSection title="Refunds">
        <p>
          Approved refunds are processed to your original payment method within 5–10 business days
          after we receive and inspect the returned item. Bank and wallet processing times may vary.
        </p>
        <p>Shipping fees are non-refundable unless the return is due to our error.</p>
      </MarketplaceStaticSection>

      <MarketplaceStaticSection title="Exchanges">
        <p>
          Exchanges for the same product (e.g. different variant) are subject to stock availability.
          We may issue a store credit if a direct exchange cannot be fulfilled promptly.
        </p>
      </MarketplaceStaticSection>

      <MarketplaceStaticSection title="Non-returnable items">
        <ul className="list-disc space-y-2 pl-5">
          <li>Final sale or clearance items marked as non-returnable at purchase.</li>
          <li>Gift cards or digital products.</li>
          <li>Items returned without prior authorization.</li>
        </ul>
      </MarketplaceStaticSection>
    </MarketplaceStaticPage>
  );
}
