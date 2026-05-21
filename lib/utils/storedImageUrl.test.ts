import { describe, expect, it } from "vitest";
import { parseCloudinaryPublicId, parseStoredUploadKey } from "@/lib/utils/storedImageUrl";

describe("parseCloudinaryPublicId", () => {
  it("extracts public_id from delivery URL", () => {
    const url =
      "https://res.cloudinary.com/demo/image/upload/v1234567890/glowish/media/library/abc123.jpg";
    expect(parseCloudinaryPublicId(url)).toBe("glowish/media/library/abc123");
  });
});

describe("parseStoredUploadKey", () => {
  it("parses local upload paths", () => {
    expect(parseStoredUploadKey("/uploads/glowish/media/library/x")).toBe(
      "glowish/media/library/x"
    );
  });

  it("parses cloudinary URLs", () => {
    const url = "https://res.cloudinary.com/c/image/upload/glowish/products/catalog/p1.png";
    expect(parseStoredUploadKey(url)).toBe("glowish/products/catalog/p1");
  });
});
