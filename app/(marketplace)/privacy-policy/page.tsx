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
    title: "Privacy Policy",
    description: `How ${settings.appName} collects, uses, and protects your personal information.`,
    path: "/privacy-policy",
    settings,
  });
}

export default async function PrivacyPolicyPage() {
  const settings = await getPublicAppSettings();
  const appName = settings.appName;

  return (
    <MarketplaceStaticPage
      eyebrow="Legal"
      title="Privacy policy"
      subtitle={`This policy describes how ${appName} handles information when you use our website, create an account, or contact us.`}
    >
      <MarketplaceStaticSection title="Information we collect">
        <p>We may collect:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Account details</strong> — name, email, phone, and saved addresses when you
            register or checkout.
          </li>
          <li>
            <strong>Order information</strong> — items purchased, payment status, shipping details,
            and communication about your order.
          </li>
          <li>
            <strong>Technical data</strong> — device type, browser, and general usage data needed to
            operate and secure the site.
          </li>
          <li>
            <strong>Messages</strong> — content you send through contact forms or support channels.
          </li>
        </ul>
      </MarketplaceStaticSection>

      <MarketplaceStaticSection title="How we use your information">
        <ul className="list-disc space-y-2 pl-5">
          <li>Process and deliver orders, including sharing delivery details with courier partners.</li>
          <li>Provide customer support and respond to inquiries.</li>
          <li>Improve our products, website, and shopping experience.</li>
          <li>Comply with legal obligations and prevent fraud or abuse.</li>
        </ul>
      </MarketplaceStaticSection>

      <MarketplaceStaticSection title="Sharing with third parties">
        <p>
          We do not sell your personal information. We may share data with service providers who
          help us run the store (payment processors, shipping couriers, email delivery, and hosting)
          only as needed to perform their services.
        </p>
      </MarketplaceStaticSection>

      <MarketplaceStaticSection title="Data retention & security">
        <p>
          We retain information for as long as needed to fulfill orders, support your account, and
          meet legal requirements. We use reasonable technical and organizational measures to protect
          data; no online service can guarantee absolute security.
        </p>
      </MarketplaceStaticSection>

      <MarketplaceStaticSection title="Your choices">
        <p>
          You may update account details in{" "}
          <Link href="/account/details" className="font-medium text-[#6ea43f] hover:underline">
            Account settings
          </Link>
          . You may request access, correction, or deletion of personal data by{" "}
          <Link href="/contact" className="font-medium text-[#6ea43f] hover:underline">
            contacting us
          </Link>
          . Marketing messages, if sent, will include an opt-out where required by law.
        </p>
      </MarketplaceStaticSection>

      <MarketplaceStaticSection title="Cookies">
        <p>
          We use essential cookies and similar technologies for sign-in, cart, and checkout. Optional
          analytics or marketing cookies, if enabled in the future, will be described in an updated
          notice on this page.
        </p>
      </MarketplaceStaticSection>

      <MarketplaceStaticSection title="Updates">
        <p>
          We may update this policy from time to time. The latest version will always be posted on
          this page with a revised effective date when material changes occur.
        </p>
        <p className="text-xs text-[#2A4C6A]/70">Last updated: May 2026</p>
      </MarketplaceStaticSection>
    </MarketplaceStaticPage>
  );
}
