import { describe, expect, it } from "vitest";
import { jntDataDigest } from "@/lib/jnt/sign";

describe("jntDataDigest", () => {
  it("produces stable base64 md5 digest", () => {
    const digest = jntDataDigest('{"txlogisticid":"PO-00001"}', "test-key");
    expect(digest).toMatch(/^[A-Za-z0-9+/]+=*$/);
    expect(jntDataDigest('{"txlogisticid":"PO-00001"}', "test-key")).toBe(digest);
  });
});
