export type HelpCategoryId =
  | "get-started"
  | "sales-operations"
  | "catalog-stock"
  | "people-rewards"
  | "insights"
  | "administration"
  | "user-journeys";

export interface HelpJourneyStep {
  title: string;
  description: string;
  /** In-app path when the step happens in the product */
  href?: string;
}

/** End-to-end flow for a persona or business outcome */
export interface HelpJourney {
  id: string;
  title: string;
  audience: string;
  description: string;
  steps: HelpJourneyStep[];
}

export interface HelpArticle {
  slug: string;
  title: string;
  summary: string;
  category: HelpCategoryId;
  /** Sidebar paths this article relates to */
  relatedPaths: string[];
  /** Optional note about permissions */
  permissionsNote?: string;
  /** Markdown body (from `.md` after frontmatter) */
  bodyMarkdown: string;
  journeys?: HelpJourney[];
}
