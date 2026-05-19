import { describe, expect, it } from "vitest";
import { consumeRateLimit } from "@/lib/utils/rateLimit";

describe("rateLimit", () => {
  it("allows requests within the limit", () => {
    const key = `test-${Date.now()}-a`;
    expect(consumeRateLimit(key, { limit: 3, windowMs: 60_000 })).toBe(true);
    expect(consumeRateLimit(key, { limit: 3, windowMs: 60_000 })).toBe(true);
    expect(consumeRateLimit(key, { limit: 3, windowMs: 60_000 })).toBe(true);
    expect(consumeRateLimit(key, { limit: 3, windowMs: 60_000 })).toBe(false);
  });
});
