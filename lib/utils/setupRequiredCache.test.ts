import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getCachedSetupRequired,
  invalidateSetupRequiredCache,
  resolveSetupRequiredForProxy,
  setCachedSetupRequired,
} from "@/lib/utils/setupRequiredCache";

vi.mock("@/lib/utils/setupRequired", () => ({
  computeSetupRequired: vi.fn(),
}));

import { computeSetupRequired } from "@/lib/utils/setupRequired";

const mockedCompute = vi.mocked(computeSetupRequired);

describe("resolveSetupRequiredForProxy", () => {
  beforeEach(() => {
    invalidateSetupRequiredCache();
    vi.clearAllMocks();
  });

  afterEach(() => {
    invalidateSetupRequiredCache();
  });

  it("returns cached value without hitting the database", async () => {
    setCachedSetupRequired(false);
    const result = await resolveSetupRequiredForProxy({
      timeoutMs: 100,
      appSetupCookieDone: false,
    });
    expect(result).toEqual({ required: false, checkFailed: false });
    expect(mockedCompute).not.toHaveBeenCalled();
  });

  it("trusts app_setup cookie when the check times out", async () => {
    mockedCompute.mockImplementation(
      () => new Promise(() => {
        /* never resolves */
      })
    );
    const result = await resolveSetupRequiredForProxy({
      timeoutMs: 50,
      appSetupCookieDone: true,
    });
    expect(result).toEqual({ required: false, checkFailed: true });
  });

  it("defaults to setup required when check fails with no cache or cookie", async () => {
    mockedCompute.mockRejectedValue(new Error("db down"));
    const result = await resolveSetupRequiredForProxy({
      timeoutMs: 4_000,
      appSetupCookieDone: false,
    });
    expect(result).toEqual({ required: true, checkFailed: true });
    expect(getCachedSetupRequired()).toBeNull();
  });
});
