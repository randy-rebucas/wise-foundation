import { prisma } from "@/lib/db/prisma";
import { deleteStoredImage } from "@/lib/server/imageStorage";
import { uploadImageBlobToStorage } from "@/lib/server/imageUpload";
import { getBrandingFolder } from "@/lib/server/uploadFolders";
import {
  getPublicAppSettings,
  toPublicAppSettings,
  updateAppSettings,
} from "@/lib/services/appSettings.service";
import { writeAuditLog, type AuditActor } from "@/lib/services/audit.service";
import type { PatchAppSettingsInput } from "@/lib/validations/appSettings.schema";
import {
  isCloudinaryStorageUrl,
  isStoredUploadUrl,
  parseCloudinaryPublicId,
  parseStoredUploadKey,
} from "@/lib/utils/storedImageUrl";

/** Logo files uploaded via Settings (not media-library picks). */
export function isDedicatedBrandingLogoUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  const folder = getBrandingFolder().replace(/^\//, "");
  return trimmed.includes(`/${folder}/`) || trimmed.includes(`${folder}/`);
}

export async function maybeRemoveReplacedAppLogo(previousUrl: string | undefined | null) {
  const prev = previousUrl?.trim() ?? "";
  if (!prev || !isDedicatedBrandingLogoUrl(prev)) return;
  await deleteStoredLogoUrl(prev).catch(() => {
    /* best-effort */
  });
}

async function deleteStoredLogoUrl(url: string): Promise<void> {
  const trimmed = url.trim();
  if (!trimmed) return;

  if (isCloudinaryStorageUrl(trimmed)) {
    const publicId = parseCloudinaryPublicId(trimmed);
    if (publicId) await deleteStoredImage(publicId, { url: trimmed });
    return;
  }

  if (isStoredUploadUrl(trimmed)) {
    const key = parseStoredUploadKey(trimmed);
    if (key) await deleteStoredImage(key, { url: trimmed });
  }
}

export async function uploadAppLogo(file: Blob, actor?: AuditActor) {
  const folder = getBrandingFolder();
  const uploaded = await uploadImageBlobToStorage(file, folder);

  const existing = await prisma.appSettings.findFirst({ orderBy: { createdAt: "asc" } });
  const previousUrl = existing?.appLogoUrl?.trim() ?? "";
  if (previousUrl && previousUrl !== uploaded.url) {
    await maybeRemoveReplacedAppLogo(previousUrl);
  }

  await updateAppSettings({ appLogoUrl: uploaded.url } as PatchAppSettingsInput);

  if (actor) {
    void writeAuditLog({ action: "settings.logo_updated", actor, targetType: "AppSettings" });
  }

  return getPublicAppSettings();
}

export async function removeAppLogo(actor?: AuditActor) {
  const existing = await prisma.appSettings.findFirst({ orderBy: { createdAt: "asc" } });
  if (!existing) throw new Error("Application settings not found");

  await maybeRemoveReplacedAppLogo(existing.appLogoUrl);

  const doc = await prisma.appSettings.update({ where: { id: existing.id }, data: { appLogoUrl: "" } });
  if (!doc) throw new Error("Application settings not found");

  if (actor) {
    void writeAuditLog({ action: "settings.logo_removed", actor, targetType: "AppSettings" });
  }

  return toPublicAppSettings(doc);
}
