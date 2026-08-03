import { prisma } from "@/lib/db/prisma";
import logger from "@/lib/logger";
import type { Prisma } from "@prisma/client";
import {
  rollbackStoredUploads,
  uploadImageBlobToStorage,
  type UploadedImageResult,
} from "@/lib/server/imageUpload";
import { deleteStoredImage } from "@/lib/server/imageStorage";
import { parseStoredUploadKey } from "@/lib/utils/storedImageUrl";
import {
  rollbackStoredVideoUploads,
  uploadVideoBlobToStorage,
  type UploadedVideoResult,
} from "@/lib/server/videoUpload";

const MAX_SEARCH_LENGTH = 100;

export type MediaAssetApiRow = {
  _id: string;
  url: string;
  publicId: string;
  filename?: string;
  mimeType: string;
  bytes: number;
  folder: string;
  createdAt: string;
  uploadedBy?: { name?: string; email?: string };
};

export function serializeMediaAssetForApi(
  doc: {
    id: string;
    url: string;
    publicId: string;
    filename?: string | null;
    mimeType: string;
    bytes: number;
    folder: string;
    createdAt?: Date | string;
    uploadedBy?: { name?: string; email?: string } | null | unknown;
  }
): MediaAssetApiRow {
  return {
    _id: doc.id,
    url: doc.url,
    publicId: doc.publicId,
    filename: doc.filename ?? undefined,
    mimeType: doc.mimeType,
    bytes: doc.bytes,
    folder: doc.folder,
    createdAt:
      doc.createdAt instanceof Date
        ? doc.createdAt.toISOString()
        : String(doc.createdAt ?? new Date().toISOString()),
    uploadedBy:
      doc.uploadedBy &&
      typeof doc.uploadedBy === "object" &&
      "name" in doc.uploadedBy
        ? {
            name: (doc.uploadedBy as { name?: string }).name,
            email: (doc.uploadedBy as { email?: string }).email,
          }
        : undefined,
  };
}

export async function registerMediaAsset(
  upload: UploadedImageResult,
  folder: string,
  uploadedBy?: string
) {
  const existing = await prisma.mediaAsset.findUnique({ where: { publicId: upload.publicId } });
  if (existing) {
    if (existing.deletedAt) {
      return prisma.mediaAsset.update({
        where: { id: existing.id },
        data: {
          deletedAt: null,
          url: upload.url,
          filename: upload.filename,
          mimeType: upload.mimeType,
          bytes: upload.bytes,
          folder,
          uploadedBy: uploadedBy || existing.uploadedBy,
        },
      });
    }
    return existing;
  }

  return prisma.mediaAsset.create({
    data: {
      url: upload.url,
      publicId: upload.publicId,
      filename: upload.filename,
      mimeType: upload.mimeType,
      bytes: upload.bytes,
      folder,
      uploadedBy: uploadedBy || undefined,
    },
  });
}

export async function uploadAndRegisterImages(
  files: Blob[],
  folder: string,
  uploadedBy?: string
) {
  const uploaded: UploadedImageResult[] = [];
  const assets: NonNullable<Awaited<ReturnType<typeof registerMediaAsset>>>[] = [];

  try {
    for (const file of files) {
      const result = await uploadImageBlobToStorage(file, folder);
      uploaded.push(result);
      try {
        const asset = await registerMediaAsset(result, folder, uploadedBy);
        if (!asset) throw new Error("Failed to register media asset");
        assets.push(asset);
      } catch (registerError) {
        /* Registration failed - clean up this upload immediately */
        await deleteStoredImage(result.publicId).catch(() => {
          logger.error({ publicId: result.publicId }, "Failed to clean up orphaned upload");
        });
        throw registerError;
      }
    }
    return assets;
  } catch (e) {
    /* Comprehensive cleanup: rollback uploads not yet registered */
    const registeredUrls = new Set(assets.map((a) => a.url));
    await rollbackStoredUploads(uploaded.filter((u) => !registeredUrls.has(u.url)));
    for (const asset of assets) {
      await prisma.mediaAsset.delete({ where: { id: asset.id } }).catch(() => {});
    }
    throw e;
  }
}

export async function uploadAndRegisterVideo(
  file: Blob,
  folder: string,
  uploadedBy?: string
) {
  let uploaded: UploadedVideoResult | undefined;
  try {
    uploaded = await uploadVideoBlobToStorage(file, folder);
    const asset = await registerMediaAsset(uploaded, folder, uploadedBy);
    if (!asset) throw new Error("Failed to register media asset");
    return asset;
  } catch (e) {
    if (uploaded) {
      await rollbackStoredVideoUploads([{ publicId: uploaded.publicId, url: uploaded.url }]);
    }
    throw e;
  }
}

export async function listMediaAssets(page = 1, limit = 24, search?: string) {
  const where: Prisma.MediaAssetWhereInput = { deletedAt: null };
  const q = search?.trim().slice(0, MAX_SEARCH_LENGTH);
  if (q && q.length > 0) {
    where.OR = [
      { filename: { contains: q, mode: "insensitive" } },
      { publicId: { contains: q, mode: "insensitive" } },
      { url: { contains: q, mode: "insensitive" } },
    ];
  }

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    prisma.mediaAsset.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: { uploader: { select: { name: true, email: true } } },
    }),
    prisma.mediaAsset.count({ where }),
  ]);

  return { items, total, pages: Math.ceil(total / limit) };
}

export async function countMediaAssetReferences(url: string): Promise<number> {
  const [productCount, variantCount] = await Promise.all([
    prisma.product.count({ where: { deletedAt: null, images: { has: url } } }),
    prisma.productVariant.count({ where: { deletedAt: null, images: { has: url } } }),
  ]);
  return productCount + variantCount;
}

export async function getMediaAssetUsage(assetId: string) {
  const asset = await prisma.mediaAsset.findFirst({ where: { id: assetId, deletedAt: null } });
  if (!asset) return null;
  const referenceCount = await countMediaAssetReferences(asset.url);
  return { asset, referenceCount };
}

export async function deleteMediaAsset(assetId: string, options: { force?: boolean } = {}) {
  const asset = await prisma.mediaAsset.findFirst({ where: { id: assetId, deletedAt: null } });
  if (!asset) return { ok: false as const, reason: "not_found" as const };

  const referenceCount = await countMediaAssetReferences(asset.url);
  if (referenceCount > 0 && !options.force) {
    return { ok: false as const, reason: "in_use" as const, referenceCount, asset };
  }

  await deleteStoredImage(asset.publicId, { url: asset.url }).catch(() => {});
  await prisma.mediaAsset.update({ where: { id: assetId }, data: { deletedAt: new Date() } });
  return { ok: true as const, asset, referenceCount };
}

export async function deleteMediaAssetsByUrls(urls: string[]) {
  for (const url of [...new Set(urls)]) {
    await deleteMediaAssetByUrl(url);
  }
}

export async function deleteMediaAssetByUrl(url: string) {
  const publicId = parseStoredUploadKey(url);
  if (!publicId) return;

  const asset = await prisma.mediaAsset.findFirst({ where: { publicId, deletedAt: null } });
  if (asset) {
    await deleteMediaAsset(asset.id, { force: true });
    return;
  }
  await deleteStoredImage(publicId).catch(() => {});
}
