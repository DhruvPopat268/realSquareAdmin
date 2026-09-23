import { useState, useEffect, useCallback, useRef } from "react";
import { GoogleMap, useJsApiLoader, OverlayView, InfoWindow } from "@react-google-maps/api";
import { Eye, MapPin, Bed } from "lucide-react";
import { propertyListingService, type MapPin as MapPinType } from "@/services/propertyListingService";

// ─── Constants ────────────────────────────────────────────────────────────────

const INDIA_CENTER = { lat: 20.5937, lng: 78.9629 };
const INDIA_ZOOM   = 5;

const SELL_ID = import.meta.env.VITE_LISTING_TYPE_SELL_ID;
const RENT_ID = import.meta.env.VITE_LISTING_TYPE_RENT_ID;
const PG_ID   = import.meta.env.VITE_LISTING_TYPE_PG_ID;

const PIN_COLOR: Record<string, string> = {
  [SELL_ID]: "#16a34a",  // green  — Sell
  [RENT_ID]: "#2563eb",  // blue   — Rent
  [PG_ID]:   "#7c3aed",  // purple — PG
};

const BADGE_STYLE: Record<string, string> = {
  [SELL_ID]: "bg-green-50 text-green-700 border border-green-200",
  [RENT_ID]: "bg-blue-50 text-blue-700 border border-blue-200",
  [PG_ID]:   "bg-purple-50 text-purple-700 border border-purple-200",
};

const MAP_OPTIONS: google.maps.MapOptions = {
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: false,
  clickableIcons: false,
};

// ─── Custom pin marker ────────────────────────────────────────────────────────

function PinMarker({
  pin,
  hovered,
  onMouseEnter,
  onMouseLeave,
  onClick,
}: {
  pin: MapPinType;
  hovered: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClick: (e: React.MouseEvent) => void;
}) {
  const ltId  = pin.listingType?.id?.toString() ?? "";
  const color = PIN_COLOR[ltId] ?? "#6b7280";
  const label = pin.price ?? pin.listingType?.name ?? "—";

  return (
    <div
      onClick={onClick}
      style={{
        transform: "translate(-50%, -100%)",
        cursor: "pointer",
        userSelect: "none",
        filter: hovered ? "drop-shadow(0 4px 8px rgba(0,0,0,0.35))" : "drop-shadow(0 2px 4px rgba(0,0,0,0.2))",
        transition: "filter 0.15s, transform 0.15s",
        transformOrigin: "bottom center",
      }}
    >
      {/* Pill label */}
      <div
        style={{
          background: color,
          color: "#fff",
          fontSize: 11,
          fontWeight: 700,
          padding: "3px 10px",
          borderRadius: 20,
          border: "2px solid #fff",
          whiteSpace: "nowrap",
          boxShadow: hovered ? "0 4px 12px rgba(0,0,0,0.25)" : "0 2px 6px rgba(0,0,0,0.18)",
          scale: hovered ? "1.1" : "1",
          transition: "scale 0.15s, box-shadow 0.15s",
        }}
      >
        {label}
      </div>
      {/* Arrow tip */}
      <div
        style={{
          width: 0,
          height: 0,
          borderLeft: "6px solid transparent",
          borderRight: "6px solid transparent",
          borderTop: `7px solid ${color}`,
          margin: "0 auto",
        }}
      />
    </div>
  );
}

// ─── Hover card ───────────────────────────────────────────────────────────────

function HoverCard({ pin, onView }: { pin: MapPinType; onView: () => void }) {
  const ltId      = pin.listingType?.id?.toString() ?? "";
  const thumbnail = pin.media?.images?.[0];

  return (
    <div
      style={{
        width: 220,
        background: "#fff",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      {/* Thumbnail */}
      <div style={{ position: "relative", height: 110 }}>
        {thumbnail ? (
          <img
            src={thumbnail}
            alt="property"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              background: "#f3f4f6",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#9ca3af",
              fontSize: 11,
            }}
          >
            No image
          </div>
        )}
        {/* Badge */}
        <span
          className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-semibold ${BADGE_STYLE[ltId] ?? "bg-gray-100 text-gray-600"}`}
        >
          {pin.listingType?.name ?? "—"}
        </span>
        {/* View button */}
        <button
          onClick={(e) => { e.stopPropagation(); onView(); }}
          className="absolute top-2 right-2 p-1.5 rounded-full bg-white/90 hover:bg-green-50 text-green-600 transition-colors"
        >
          <Eye className="h-3 w-3" />
        </button>
      </div>

      {/* Info */}
      <div className="p-2.5 space-y-1">
        {/* Price */}
        <p className="text-sm font-bold text-gray-900">{pin.price ?? "Price on request"}</p>

        {/* Category + type badges */}
        <div className="flex flex-wrap gap-1">
          {pin.category?.name && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
              {pin.category.name}
            </span>
          )}
          {pin.propertyType?.name && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600">
              {pin.propertyType.name}
            </span>
          )}
        </div>

        {/* BHK */}
        {pin.residentialDetails?.bhk && (
          <p className="text-[11px] text-gray-500 flex items-center gap-1">
            <Bed className="h-3 w-3" /> {pin.residentialDetails.bhk} BHK
          </p>
        )}

        {/* Address */}
        <p className="text-[11px] text-gray-500 flex items-start gap-1 line-clamp-2">
          <MapPin className="h-3 w-3 shrink-0 mt-0.5" />
          {pin.locality?.address ?? pin.cityName ?? "—"}
        </p>

        {/* Listed by */}
        {pin.listedBy?.name && (
          <p className="text-[10px] text-gray-400">
            By {pin.listedBy.name}
            {pin.listedBy.role?.name ? ` (${pin.listedBy.role.name})` : ""}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Legend ───────────────────────────────────────────────────────────────────

function Legend() {
  return (
    <div className="absolute bottom-6 left-4 bg-white/95 backdrop-blur-sm rounded-xl px-3 py-2.5 shadow-lg border border-gray-200 flex flex-col gap-1.5 z-10">
      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Listing Type</p>
      {[
        { color: "#16a34a", label: "Sell" },
        { color: "#2563eb", label: "Rent" },
        { color: "#7c3aed", label: "PG / Co-living" },
      ].map(({ color, label }) => (
        <div key={label} className="flex items-center gap-2">
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: color, flexShrink: 0 }} />
          <span className="text-[11px] text-gray-600">{label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface PropertyMapViewProps {
  purposeId?:  string;
  categoryId?: string;
  typeId?:     string;
  userId?:     string;
  roleId?:     string;
  activeCount?: number;
  onViewProperty: (id: string) => void;
}

export default function PropertyMapView({ purposeId, categoryId, typeId, userId, roleId, activeCount, onViewProperty }: PropertyMapViewProps) {
  const [pins,     setPins]     = useState<MapPinType[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? "",
  });

  // Fetch pins whenever filters change
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    propertyListingService
      .getMapPins({ purposeId, categoryId, typeId, userId, roleId })
      .then((res) => {
        if (cancelled) return;
        setPins(res.data.data ?? []);
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load map pins");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [purposeId, categoryId, typeId, userId, roleId]);

  // Fit map bounds once pins are loaded
  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  useEffect(() => {
    if (!mapRef.current || pins.length === 0) return;
    const bounds = new window.google.maps.LatLngBounds();
    let hasPoints = false;
    pins.forEach((p) => {
      const lat = p.locality?.latitude;
      const lng = p.locality?.longitude;
      if (lat != null && lng != null) {
        bounds.extend({ lat, lng });
        hasPoints = true;
      }
    });
    if (hasPoints) mapRef.current.fitBounds(bounds, 80);
  }, [pins, isLoaded]);

  const pinsWithCoords = pins.filter(
    (p) => p.locality?.latitude != null && p.locality?.longitude != null
  );

  return (
    <div
      className="relative w-full rounded-xl overflow-hidden border border-border"
      style={{ height: "calc(100vh - 130px)" }}
    >
      {/* Loading overlay */}
      {(loading || !isLoaded) && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mb-3" />
          <p className="text-sm text-muted-foreground">Loading map…</p>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/90">
          <p className="text-sm text-red-500">{error}</p>
        </div>
      )}

      {/* Empty state overlay (shown on top of map) */}
      {!loading && !error && isLoaded && pinsWithCoords.length === 0 && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl px-8 py-6 shadow-lg border border-gray-200 flex flex-col items-center gap-2">
            <MapPin className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-semibold text-gray-700">No active properties with location data</p>
            <p className="text-xs text-muted-foreground">Properties need latitude & longitude to appear on the map</p>
          </div>
        </div>
      )}

      {/* Pin count badge */}
      {!loading && pinsWithCoords.length > 0 && (
        <div className="absolute top-4 right-4 z-10 bg-white/95 backdrop-blur-sm rounded-full px-3 py-1.5 shadow border border-gray-200">
          <p className="text-xs font-semibold text-gray-700">
            {pinsWithCoords.length} active propert{pinsWithCoords.length !== 1 ? "ies" : "y"}
          </p>
        </div>
      )}

      {/* Legend */}
      <Legend />

      {/* Map */}
      {isLoaded && (
        <GoogleMap
          mapContainerStyle={{ width: "100%", height: "100%" }}
          center={INDIA_CENTER}
          zoom={INDIA_ZOOM}
          options={MAP_OPTIONS}
          onLoad={onMapLoad}
          onClick={() => setSelectedId(null)}
        >
          {pinsWithCoords.map((pin) => {
            const lat = pin.locality!.latitude!;
            const lng = pin.locality!.longitude!;
            const isSelected = selectedId === pin._id;

            return (
              <div key={pin._id}>
                {/* Card — InfoWindow handles boundary detection automatically */}
                {isSelected && (
                  <InfoWindow
                    position={{ lat, lng }}
                    onCloseClick={() => setSelectedId(null)}
                    options={{ pixelOffset: new window.google.maps.Size(0, -40) }}
                  >
                    <div style={{ padding: 0, margin: 0 }}>
                      <HoverCard
                        pin={pin}
                        onView={() => onViewProperty(pin._id)}
                      />
                    </div>
                  </InfoWindow>
                )}

                {/* Pin marker */}
                <OverlayView
                  position={{ lat, lng }}
                  mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                >
                  <PinMarker
                    pin={pin}
                    hovered={isSelected}
                    onMouseEnter={() => {}}
                    onMouseLeave={() => {}}
                    onClick={(e) => { e.stopPropagation(); setSelectedId(isSelected ? null : pin._id); }}
                  />
                </OverlayView>
              </div>
            );
          })}
        </GoogleMap>
      )}
    </div>
  );
}
