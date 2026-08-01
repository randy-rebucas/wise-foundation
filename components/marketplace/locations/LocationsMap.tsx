"use client";

import { useMemo, useState } from "react";
import { GoogleMap, InfoWindowF, MarkerF, useJsApiLoader } from "@react-google-maps/api";
import { MapPin, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PublicLocation } from "@/lib/services/locations.service";

const MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

const ORG_TYPE_LABELS: Record<string, string> = {
  distributor: "Distributor",
  franchise: "Franchise",
  partner: "Partner",
  headquarters: "Head Office",
};

const FILTERS = [
  { value: "all", label: "All locations" },
  { value: "distributor", label: "Distributors" },
  { value: "franchise", label: "Franchises" },
  { value: "partner", label: "Partners" },
  { value: "headquarters", label: "Head Offices" },
] as const;

type FilterValue = (typeof FILTERS)[number]["value"];

function locationLabel(loc: PublicLocation): string {
  if (loc.isHeadOffice) return "Head Office";
  return loc.organizationType ? ORG_TYPE_LABELS[loc.organizationType] ?? "Location" : "Location";
}

const MAP_CONTAINER_STYLE = { width: "100%", height: "100%" };

function LocationsList({
  locations,
  activeId,
  onSelect,
}: {
  locations: PublicLocation[];
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  if (locations.length === 0) {
    return (
      <p className="p-4 text-sm text-[#2A4C6A]/70">No locations match this filter.</p>
    );
  }

  return (
    <ul className="max-h-[420px] space-y-2 overflow-y-auto p-3">
      {locations.map((loc) => (
        <li key={loc.id}>
          <button
            type="button"
            onClick={() => onSelect(loc.id)}
            className={cn(
              "w-full rounded-[10px] border p-3 text-left transition",
              activeId === loc.id
                ? "border-[#6ea43f] bg-[#f3f9ec]"
                : "border-white/60 bg-white/50 hover:bg-white/70"
            )}
          >
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#6ea43f]" aria-hidden />
              <div>
                <p className="text-sm font-semibold text-[#1e3157]">{loc.name}</p>
                <p className="text-xs text-[#2A4C6A]/75">{locationLabel(loc)}</p>
                <p className="mt-1 text-xs leading-5 text-[#2A4C6A]/70">{loc.address}</p>
                {loc.phone && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-[#2A4C6A]/70">
                    <Phone className="h-3 w-3" aria-hidden />
                    {loc.phone}
                  </p>
                )}
              </div>
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}

function MapView({
  locations,
  activeId,
  onSelect,
}: {
  locations: PublicLocation[];
  activeId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: MAPS_API_KEY as string,
    id: "locations-map-script",
  });

  const center = useMemo(() => {
    if (locations.length === 0) return { lat: 12.8797, lng: 121.774 };
    const sum = locations.reduce(
      (acc, l) => ({ lat: acc.lat + l.lat, lng: acc.lng + l.lng }),
      { lat: 0, lng: 0 }
    );
    return { lat: sum.lat / locations.length, lng: sum.lng / locations.length };
  }, [locations]);

  function handleMapLoad(map: google.maps.Map) {
    if (locations.length <= 1) return;
    const bounds = new google.maps.LatLngBounds();
    locations.forEach((loc) => bounds.extend({ lat: loc.lat, lng: loc.lng }));
    map.fitBounds(bounds);
  }

  if (!isLoaded) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-[#2A4C6A]/70">
        Loading map…
      </div>
    );
  }

  const active = locations.find((l) => l.id === activeId) ?? null;

  return (
    <GoogleMap
      mapContainerStyle={MAP_CONTAINER_STYLE}
      center={center}
      zoom={locations.length > 0 ? 6 : 5}
      onLoad={handleMapLoad}
      options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: false }}
    >
      {locations.map((loc) => (
        <MarkerF
          key={loc.id}
          position={{ lat: loc.lat, lng: loc.lng }}
          title={loc.name}
          onClick={() => onSelect(loc.id)}
        />
      ))}
      {active && (
        <InfoWindowF
          position={{ lat: active.lat, lng: active.lng }}
          onCloseClick={() => onSelect(null)}
        >
          <div className="max-w-[220px] text-sm text-[#1e3157]">
            <p className="font-semibold">{active.name}</p>
            <p className="mt-0.5 text-xs text-[#2A4C6A]/75">{locationLabel(active)}</p>
            <p className="mt-1 text-xs leading-5">{active.address}</p>
            {active.phone && <p className="mt-1 text-xs">{active.phone}</p>}
          </div>
        </InfoWindowF>
      )}
    </GoogleMap>
  );
}

export function LocationsMap({ locations }: { locations: PublicLocation[] }) {
  const [filter, setFilter] = useState<FilterValue>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (filter === "all") return locations;
    if (filter === "headquarters") return locations.filter((l) => l.isHeadOffice);
    return locations.filter((l) => l.organizationType === filter);
  }, [locations, filter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={cn(
              "rounded-[10px] px-3.5 py-1.5 text-xs font-semibold transition",
              filter === f.value
                ? "bg-gradient-to-r from-[#6ea43f] to-[#477d34] text-white shadow-sm"
                : "border border-white/70 bg-white/50 text-[#2A4C6A] hover:bg-white/70"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="h-[420px] overflow-hidden rounded-[10px] border border-white/65 bg-white/50 shadow-[0_18px_55px_rgba(70,90,58,0.14)]">
          {MAPS_API_KEY ? (
            <MapView locations={filtered} activeId={selectedId} onSelect={setSelectedId} />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-sm text-[#2A4C6A]/70">
              <MapPin className="h-6 w-6 text-[#6ea43f]" aria-hidden />
              <p>Map unavailable — locations listed below.</p>
            </div>
          )}
        </div>

        <div className="overflow-hidden rounded-[10px] border border-white/65 bg-white/50 shadow-[0_18px_55px_rgba(70,90,58,0.14)]">
          <LocationsList locations={filtered} activeId={selectedId} onSelect={setSelectedId} />
        </div>
      </div>
    </div>
  );
}
