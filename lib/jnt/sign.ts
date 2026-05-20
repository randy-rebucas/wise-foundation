import { createHash } from "crypto";

/** J&T data_digest: Base64(MD5(logistics_interface + privateKey)). */
export function jntDataDigest(logisticsInterface: string, privateKey: string): string {
  return createHash("md5")
    .update(logisticsInterface + privateKey, "utf8")
    .digest("base64");
}
