const MAX_SIGNATURE_DATA_URL_LENGTH = 600_000;

/** Validate a PNG (or JPEG) data URL for storage. */
export function assertValidSignatureDataUrl(dataUrl: string): void {
  const trimmed = dataUrl.trim();
  if (!/^data:image\/(png|jpeg|jpg);base64,/i.test(trimmed)) {
    throw new Error("Signature must be a PNG or JPEG image.");
  }
  if (trimmed.length > MAX_SIGNATURE_DATA_URL_LENGTH) {
    throw new Error("Signature image is too large.");
  }
}

export function signatureDataUrlToBuffer(dataUrl: string): Buffer {
  assertValidSignatureDataUrl(dataUrl);
  const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, "");
  return Buffer.from(base64, "base64");
}
