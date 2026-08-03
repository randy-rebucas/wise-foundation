import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import type { OrganizationType } from "@prisma/client";
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
  const branches = await prisma.branch.findMany({
    where: { isActive: true, deletedAt: null },
    select: {
      id: true,
      name: true,
      code: true,
      address: true,
      phone: true,
      isHeadOffice: true,
      organization: { select: { name: true, type: true } },
    },
    orderBy: [{ isHeadOffice: "desc" }, { name: "asc" }],
  });

  const geocoded = await Promise.all(
    branches.map(async (branch) => {
      const coords = await geocodeAddress(branch.address);
      if (!coords) return null;

      const location: PublicLocation = {
        id: branch.id,
        name: branch.name,
        code: branch.code,
        address: branch.address,
        phone: branch.phone ?? null,
        isHeadOffice: branch.isHeadOffice,
        organizationType: branch.organization?.type ?? null,
        organizationName: branch.organization?.name ?? null,
        lat: coords.lat,
        lng: coords.lng,
      };
      return location;
    })
  );

  return geocoded.filter((l): l is PublicLocation => l !== null);
}
