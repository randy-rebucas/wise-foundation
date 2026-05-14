import type { HelpCategoryId } from "./types";

export const HELP_CATEGORIES: Record<
  HelpCategoryId,
  { label: string; description: string; order: number }
> = {
  "get-started": {
    label: "Get started",
    description: "Sign-in, home routes, and how the app is organized.",
    order: 0,
  },
  "user-journeys": {
    label: "User journeys",
    description: "Role-based walkthroughs from first login to recurring tasks.",
    order: 1,
  },
  "sales-operations": {
    label: "Sales & operations",
    description: "POS, orders, reseller sales, and day-to-day selling.",
    order: 2,
  },
  "catalog-stock": {
    label: "Catalog & stock",
    description: "Products, inventory, and purchase orders.",
    order: 3,
  },
  "people-rewards": {
    label: "People & rewards",
    description: "Members and commissions.",
    order: 4,
  },
  insights: {
    label: "Insights",
    description: "Reports and KPIs.",
    order: 5,
  },
  administration: {
    label: "Administration",
    description: "Branches, users, team, and organizations.",
    order: 6,
  },
};
