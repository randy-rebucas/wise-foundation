import { unstable_cache } from "next/cache";
import { connectDB } from "@/lib/db/connect";
import { Branch } from "@/lib/db/models/Branch";
// Side-effect import: registers the Organization schema so `.populate("organizationId")` below works.
import "@/lib/db/models/Organization";
import type { OrganizationType } from "@/lib/db/models/Organization";
import logger from "@/lib/logger";

export interface PublicLocation {
  id: string;
  name: string;
  code: string;
  address: string;
  phone: string | null;
  isHeadOffice: boolean;
  organizationType: OrganizationType | null;
  organizationName: string | null;
  lat: number;
  lng: number;
}

interface GeocodeResult {
  lat: number;
  lng: number;
}

/** Geocodes a free-text address via the Google Geocoding API. Cached for 24h since addresses rarely change and calls are billed. */
const geocodeAddress = unstable_cache(
  async (address: string): Promise<GeocodeResult | null> => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) return null;

    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        address
      )}&key=${apiKey}`;
      const res = await fetch(url);
      if (!res.ok) return null;

      const data = await res.json();
      const location = data?.results?.[0]?.geometry?.location;
      if (!location || typeof location.lat !== "number" || typeof location.lng !== "number") {
        return null;
      }
      return { lat: location.lat, lng: location.lng };
    } catch (err) {
      logger.error({ err, address }, "Failed to geocode branch address");
      return null;
    }
  },
  ["geocode-address"],
  { revalidate: 60 * 60 * 24 }
);

/** Active branches with geocoded coordinates, for the public /locations map. Branches whose address fails to geocode are omitted. */
export async function getPublicLocations(): Promise<PublicLocation[]> {
  await connectDB();

  const branches = await Branch.find({ isActive: true, deletedAt: null })
    .select("name code address phone isHeadOffice organizationId")
    .populate("organizationId", "name type")
    .sort({ isHeadOffice: -1, name: 1 })
    .lean();

  const geocoded = await Promise.all(
    branches.map(async (branch) => {
      const coords = await geocodeAddress(branch.address);
      if (!coords) return null;

      const org = branch.organizationId as { name?: string; type?: OrganizationType } | null;

      const location: PublicLocation = {
        id: String(branch._id),
        name: branch.name,
        code: branch.code,
        address: branch.address,
        phone: branch.phone ?? null,
        isHeadOffice: branch.isHeadOffice,
        organizationType: org?.type ?? null,
        organizationName: org?.name ?? null,
        lat: coords.lat,
        lng: coords.lng,
      };
      return location;
    })
  );

  return geocoded.filter((l): l is PublicLocation => l !== null);
}
