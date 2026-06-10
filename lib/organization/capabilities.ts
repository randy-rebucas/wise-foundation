import type { IOrganizationSettings, OrganizationType } from "@/lib/db/models/Organization";
import { TYPE_DEFAULT_SETTINGS } from "@/lib/organization/typeDefaults";
import type { SessionUser } from "@/types";

/** How org users view/manage stock. */
export type InventorySurface = "branch" | "organization" | "none";

/** Whether in-store POS is available (branch-scoped). */
export type PosSurface = "branch" | "none";

export interface OrgCapabilities {
  organizationId: string;
  type: OrganizationType;
  settings: IOrganizationSettings;
  inventorySurface: InventorySurface;
  posSurface: PosSurface;
}

export function resolveOrgCapabilities(org: {
  type: OrganizationType;
  settings?: Partial<IOrganizationSettings> | null;
}): OrgCapabilities {
  const defaults = TYPE_DEFAULT_SETTINGS[org.type];
  const settings: IOrganizationSettings = {
    ...defaults,
    ...(org.settings ?? {}),
  };

  let inventorySurface: InventorySurface = "none";
  if (settings.hasInventory) {
    inventorySurface = settings.canSellRetail ? "branch" : "organization";
  }

  const posSurface: PosSurface = settings.canSellRetail ? "branch" : "none";

  return {
    organizationId: "",
    type: org.type,
    settings,
    inventorySurface,
    posSurface,
  };
}

const ORG_CAPS_TTL_MS = 2 * 60 * 1000; // 2 minutes

interface CacheEntry {
  caps: OrgCapabilities | null;
  expiresAt: number;
}

const orgCapsCache = new Map<string, CacheEntry>();

export function invalidateOrgCapabilitiesCache(organizationId: string): void {
  orgCapsCache.delete(organizationId);
}

export async function loadOrganizationCapabilities(
  organizationId: string
): Promise<OrgCapabilities | null> {
  const now = Date.now();
  const hit = orgCapsCache.get(organizationId);
  if (hit && hit.expiresAt > now) return hit.caps;

  const { connectDB } = await import("@/lib/db/connect");
  const { Organization } = await import("@/lib/db/models/Organization");
  await connectDB();
  const org = await Organization.findOne({ _id: organizationId, deletedAt: null, isActive: true })
    .select("type settings")
    .lean();

  const caps = org
    ? { ...resolveOrgCapabilities({ type: org.type, settings: org.settings }), organizationId: org._id.toString() }
    : null;

  orgCapsCache.set(organizationId, { caps, expiresAt: now + ORG_CAPS_TTL_MS });
  return caps;
}

export async function loadOrganizationCapabilitiesForUser(
  user: Pick<SessionUser, "organizationId">
): Promise<OrgCapabilities | null> {
  if (!user.organizationId) return null;
  return loadOrganizationCapabilities(user.organizationId);
}

export class OrganizationCapabilityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OrganizationCapabilityError";
  }
}

export async function assertInventoryAccessForUser(user: SessionUser): Promise<OrgCapabilities | null> {
  if (user.role !== "ORG_ADMIN" || !user.organizationId) return null;
  const caps = await loadOrganizationCapabilitiesForUser(user);
  if (!caps) throw new OrganizationCapabilityError("Organization not found");
  if (caps.inventorySurface === "none") {
    throw new OrganizationCapabilityError(
      "Inventory is not enabled for this organization type"
    );
  }
  return caps;
}

export async function assertPosAccessForUser(user: SessionUser): Promise<OrgCapabilities | null> {
  if (user.role !== "ORG_ADMIN" || !user.organizationId) return null;
  const caps = await loadOrganizationCapabilitiesForUser(user);
  if (!caps) throw new OrganizationCapabilityError("Organization not found");
  if (caps.posSurface === "none") {
    throw new OrganizationCapabilityError(
      "Point of sale is not available for this organization type"
    );
  }
  return caps;
}

export function isOrganizationCapabilityError(err: unknown): err is OrganizationCapabilityError {
  return err instanceof OrganizationCapabilityError;
}
