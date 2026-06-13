import logger from "@/lib/logger";

type EnvSpec = { key: string; required: boolean; description: string };

const ENV_SPECS: EnvSpec[] = [
  { key: "MONGODB_URI", required: true, description: "MongoDB connection string" },
  { key: "AUTH_SECRET", required: true, description: "NextAuth signing secret" },
  { key: "AUTH_URL", required: true, description: "Application base URL for NextAuth" },
  {
    key: "NEXT_PUBLIC_APP_URL",
    required: false,
    description: "Public storefront URL (canonical URLs, OG tags)",
  },
  {
    key: "CLOUDINARY_URL",
    required: false,
    description: "Cloudinary connection URL (image storage)",
  },
  {
    key: "PAYMONGO_SECRET_KEY",
    required: false,
    description: "PayMongo secret key (card/GCash payments)",
  },
  {
    key: "NEXT_PUBLIC_PAYMONGO_PUBLIC_KEY",
    required: false,
    description: "PayMongo public key (client-side tokenisation)",
  },
  {
    key: "RESEND_API_KEY",
    required: false,
    description: "Resend API key for transactional email (verification, order confirmation)",
  },
];

/** Throw if any required env var is absent. Log a summary of optional vars. */
export function validateEnv(): void {
  const missing: string[] = [];

  for (const spec of ENV_SPECS) {
    const value = process.env[spec.key];
    if (!value?.trim()) {
      if (spec.required) {
        missing.push(`${spec.key} — ${spec.description}`);
      } else {
        logger.warn({ key: spec.key }, `Optional env var not set: ${spec.description}`);
      }
    }
  }

  if (missing.length > 0) {
    const list = missing.map((m) => `  • ${m}`).join("\n");
    throw new Error(`Missing required environment variables:\n${list}`);
  }

  logger.info("Environment validation passed");
}
