export type RetryOptions = {
  attempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  /** Return true to abort retrying (e.g. 4xx errors that won't resolve on retry). */
  shouldAbort?: (err: unknown) => boolean;
};

/**
 * Retry an async operation with full jitter exponential backoff.
 * Aborts immediately on non-retryable errors (shouldAbort returns true).
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions = {}
): Promise<T> {
  const { attempts = 3, baseDelayMs = 200, maxDelayMs = 5000, shouldAbort } = opts;

  let lastErr: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (shouldAbort?.(err)) throw err;
      if (attempt === attempts) break;
      const exp = baseDelayMs * 2 ** (attempt - 1);
      const delay = Math.min(exp + Math.random() * exp, maxDelayMs);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}
