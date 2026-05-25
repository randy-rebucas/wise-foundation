import { computeSetupRequired } from "@/lib/utils/setupRequired";
import logger from "@/lib/logger";

type CacheEntry = { required: boolean; at: number };

const TTL_WHEN_COMPLETE_MS = 60_000;
const TTL_WHEN_REQUIRED_MS = 10_000;

let cache: CacheEntry | null = null;
let inflight: Promise<boolean> | null = null;

function cacheFresh(entry: CacheEntry): boolean {
  const ttl = entry.required ? TTL_WHEN_REQUIRED_MS : TTL_WHEN_COMPLETE_MS;
  return Date.now() - entry.at < ttl;
}

export function getCachedSetupRequired(): boolean | null {
  if (cache && cacheFresh(cache)) return cache.required;
  return null;
}

export function setCachedSetupRequired(required: boolean): void {
  cache = { required, at: Date.now() };
}

export function invalidateSetupRequiredCache(): void {
  cache = null;
  inflight = null;
}

async function loadSetupRequired(): Promise<boolean> {
  if (!inflight) {
    inflight = computeSetupRequired()
      .then((required) => {
        setCachedSetupRequired(required);
        return required;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

export type SetupRequiredResolution = {
  required: boolean;
  checkFailed: boolean;
};

/**
 * Resolves whether setup is required for proxy routing.
 * Uses TTL cache + in-flight dedupe; on timeout/DB errors uses cache or cookie hint.
 */
export async function resolveSetupRequiredForProxy(options: {
  timeoutMs: number;
  appSetupCookieDone: boolean;
}): Promise<SetupRequiredResolution> {
  const cached = getCachedSetupRequired();
  if (cached !== null) {
    return { required: cached, checkFailed: false };
  }

  try {
    const required = await Promise.race([
      loadSetupRequired(),
      new Promise<boolean>((_, reject) => {
        setTimeout(() => reject(new Error("Setup check timed out")), options.timeoutMs);
      }),
    ]);
    return { required, checkFailed: false };
  } catch (err) {
    const stale = cache?.required;
    if (stale !== undefined) {
      logger.warn({ err }, "[proxy] setup check failed, using stale cache");
      return { required: stale, checkFailed: true };
    }
    if (options.appSetupCookieDone) {
      logger.warn({ err }, "[proxy] setup check failed, trusting app_setup cookie");
      return { required: false, checkFailed: true };
    }
    logger.error({ err }, "[proxy] setup check failed");
    return { required: true, checkFailed: true };
  }
}
