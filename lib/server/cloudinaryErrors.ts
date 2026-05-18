import "server-only";

type CloudinaryApiError = {
  message?: string;
  http_code?: number;
  name?: string;
};

export class CloudinaryUploadError extends Error {
  readonly httpCode?: number;

  constructor(message: string, httpCode?: number) {
    super(message);
    this.name = "CloudinaryUploadError";
    this.httpCode = httpCode;
  }
}

export function normalizeCloudinaryError(err: unknown): CloudinaryUploadError {
  if (err instanceof CloudinaryUploadError) return err;

  const raw = err as CloudinaryApiError;
  const message = raw?.message?.trim() ?? "";
  const httpCode = raw?.http_code;

  if (message.includes("cloud_name is disabled")) {
    return new CloudinaryUploadError(
      "Your Cloudinary cloud is disabled. Re-enable it in the Cloudinary console, or remove CLOUDINARY_* env vars to use local uploads (public/uploads).",
      401
    );
  }

  if (httpCode === 401 || message.toLowerCase().includes("invalid api key")) {
    return new CloudinaryUploadError(
      "Cloudinary authentication failed. Check CLOUDINARY_URL or CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in .env.local.",
      401
    );
  }

  if (httpCode === 403) {
    return new CloudinaryUploadError(
      "Cloudinary refused this upload. Check account limits and API key permissions.",
      403
    );
  }

  if (message) {
    return new CloudinaryUploadError(message, httpCode);
  }

  return new CloudinaryUploadError("Cloudinary upload failed.", httpCode);
}

/** Account or credential problems where local fallback may be appropriate. */
export function isCloudinaryAccountError(err: unknown): boolean {
  const normalized = normalizeCloudinaryError(err);
  return normalized.httpCode === 401 || normalized.httpCode === 403;
}

export function httpStatusForCloudinaryError(err: unknown): number {
  const normalized = normalizeCloudinaryError(err);
  if (normalized.httpCode === 401 || normalized.httpCode === 403) return 503;
  return 500;
}
