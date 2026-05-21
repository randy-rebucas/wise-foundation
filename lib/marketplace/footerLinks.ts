export type MarketplaceFooterLink = {
  label: string;
  href: string;
};

export type MarketplaceFooterColumn = {
  title: string;
  links: MarketplaceFooterLink[];
};

export const MARKETPLACE_FOOTER_COLUMNS: MarketplaceFooterColumn[] = [
  {
    title: "Shop",
    links: [
      { label: "All Products", href: "/shop" },
      { label: "Best Sellers", href: "/shop" },
      { label: "New Arrivals", href: "/shop" },
      { label: "Sale", href: "/shop" },
    ],
  },
  {
    title: "Help",
    links: [
      { label: "FAQs", href: "/faqs" },
      { label: "Shipping & Delivery", href: "/shipping-delivery" },
      { label: "Returns & Refunds", href: "/returns-refunds" },
      { label: "Contact Us", href: "/contact" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About Us", href: "/about-us" },
      { label: "Our Ingredients", href: "/categories" },
      { label: "Reviews", href: "/reviews" },
      { label: "Privacy Policy", href: "/privacy-policy" },
    ],
  },
];
