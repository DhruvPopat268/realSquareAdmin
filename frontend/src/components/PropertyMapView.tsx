import { useState } from "react";
import { GoogleMap, LoadScript, Marker, InfoWindow } from "@react-google-maps/api";
import { Eye, Bed, Bath, Maximize2, MapPin } from "lucide-react";
import type { Property } from "@/data/propertiesData";
import { LISTING_STATUS_LABEL } from "@/data/propertiesData";

const statusStyle: Record<string, string> = {
  PENDING_APPROVAL: "bg-yellow-50 text-yellow-700 border border-yellow-200",
  ACTIVE:           "bg-green-50 text-green-700 border border-green-200",
  RESERVED:         "bg-blue-50 text-blue-700 border border-blue-200",
  SOLD:             "bg-gray-100 text-gray-600 border border-gray-200",
  RENTED:           "bg-teal-50 text-teal-700 border border-teal-200",
  EXPIRED:          "bg-orange-50 text-orange-700 border border-orange-200",
  INACTIVE:         "bg-slate-100 text-slate-500 border border-slate-200",
  ARCHIVED:         "bg-stone-100 text-stone-500 border border-stone-200",
  REJECTED:         "bg-red-50 text-red-600 border border-red-200",
};

const purposeStyle: Record<string, string> = {
  "Sell":           "bg-blue-50 text-blue-700 border border-blue-200",
  "Rent":           "bg-green-50 text-green-700 border border-green-200",
  "PG / Co-living": "bg-purple-50 text-purple-700 border border-purple-200",
};

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  return `$${(n / 1_000).toFixed(0)}K`;
}

const mapContainerStyle = { width: "100%", height: "100%" };

const center = {
  lat: 37.0902,
  lng: -95.7129,
};

export default function PropertyMapView({ properties, onViewProperty }: { properties: Property[]; onViewProperty: (id: number) => void }) {
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "YOUR_API_KEY_HERE";
  const mapProperties = properties.slice(0, 5);

  return (
    <div className="flex gap-4 items-stretch" style={{ height: 1000 }}>
      {/* Left Panel - Property List */}
      <div className="w-96 h-full overflow-y-auto space-y-3 px-1 py-1">
        {mapProperties.map((p) => (
          <div
            key={p.id}
            className={`bg-card rounded-lg border overflow-hidden cursor-pointer transition-all ${
              hoveredId === p.id ? "ring-2 ring-blue-500 shadow-lg" : "hover:shadow-md"
            }`}
            onMouseEnter={() => setHoveredId(p.id)}
            onMouseLeave={() => setHoveredId(null)}
            onClick={() => setSelectedProperty(p)}
          >
            <div className="relative h-32">
              <img src={p.images[0]} alt={p.title} className="w-full h-full object-cover" />
              <div className="absolute top-2 left-2 flex gap-1">
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${purposeStyle[p.purpose]}`}>{p.purpose}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${statusStyle[p.status]}`}>{LISTING_STATUS_LABEL[p.status]}</span>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); onViewProperty(p.id); }}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-white/90 hover:bg-green-50 text-green-600 transition-colors"
              >
                <Eye className="h-3 w-3" />
              </button>
            </div>
              <div className="p-3">
              <p className="text-sm font-bold text-foreground">{fmt(p.price)}</p>
              <p className="text-xs font-semibold text-foreground mt-0.5 line-clamp-1">{p.title}</p>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-1">
                <MapPin className="h-2.5 w-2.5 shrink-0" />{p.address}
              </div>
              <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
                {p.beds !== undefined && <span className="flex items-center gap-0.5"><Bed className="h-3 w-3" />{p.beds}</span>}
                {p.baths !== undefined && <span className="flex items-center gap-0.5"><Bath className="h-3 w-3" />{p.baths}</span>}
                {p.sqft !== undefined && <span className="flex items-center gap-0.5"><Maximize2 className="h-3 w-3" />{p.sqft.toLocaleString()}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Right Panel - Map */}
      <div className="flex-1 h-full rounded-lg border overflow-hidden">
        <LoadScript googleMapsApiKey={apiKey} onLoad={() => setIsLoaded(true)}>
          {isLoaded && (
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={center}
              zoom={4}
              options={{
                zoomControl: true,
                streetViewControl: false,
                mapTypeControl: false,
                fullscreenControl: true,
                mapTypeId: "hybrid",
              }}
            >
              {mapProperties.map((p) => (
                <Marker
                  key={p.id}
                  position={{ lat: p.lat, lng: p.lng }}
                  label={{
                    text: fmt(p.price),
                    color: "#fff",
                    fontSize: "12px",
                    fontWeight: "bold",
                  }}
                  onClick={() => setSelectedProperty(p)}
                  onMouseOver={() => setHoveredId(p.id)}
                  onMouseOut={() => setHoveredId(null)}
                  icon={(() => {
                    const label = fmt(p.price);
                    const w = Math.max(60, label.length * 10 + 24);
                    const fill = hoveredId === p.id ? '#3b82f6' : '#1f2937';
                    return {
                      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`<svg width="${w}" height="32" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="${w - 4}" height="28" rx="14" fill="${fill}" stroke="#fff" stroke-width="2"/><text x="${w / 2}" y="21" font-size="12" font-weight="bold" fill="#fff" text-anchor="middle" font-family="Arial,sans-serif">${label}</text></svg>`)}`,
                      scaledSize: new window.google.maps.Size(w, 32),
                      anchor: new window.google.maps.Point(w / 2, 32),
                    };
                  })()}
                />
              ))}

              {selectedProperty && (
                <InfoWindow
                  position={{ lat: selectedProperty.lat, lng: selectedProperty.lng }}
                  onCloseClick={() => setSelectedProperty(null)}
                >
                  <div className="w-64">
                    <img src={selectedProperty.images[0]} alt={selectedProperty.title} className="w-full h-32 object-cover rounded-t" />
                    <div className="p-2">
                      <div className="flex items-center gap-1 mb-1">
                        <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 9999, background: selectedProperty.purpose === 'Sell' ? '#eff6ff' : selectedProperty.purpose === 'Rent' ? '#f0fdf4' : '#faf5ff', color: selectedProperty.purpose === 'Sell' ? '#1d4ed8' : selectedProperty.purpose === 'Rent' ? '#15803d' : '#7e22ce', border: '1px solid', borderColor: selectedProperty.purpose === 'Sell' ? '#bfdbfe' : selectedProperty.purpose === 'Rent' ? '#bbf7d0' : '#e9d5ff', fontWeight: 600 }}>{selectedProperty.purpose}</span>
                      </div>
                      <p className="text-sm font-bold">{fmt(selectedProperty.price)}</p>
                      <p className="text-xs font-semibold mt-0.5">{selectedProperty.title}</p>
                      <p className="text-[10px] text-gray-600 mt-1">{selectedProperty.address}</p>
                      <div className="flex items-center gap-2 mt-2 text-[10px]">
                        {selectedProperty.beds !== undefined && <span className="flex items-center gap-0.5"><Bed className="h-3 w-3" />{selectedProperty.beds}</span>}
                        {selectedProperty.baths !== undefined && <span className="flex items-center gap-0.5"><Bath className="h-3 w-3" />{selectedProperty.baths}</span>}
                        {selectedProperty.sqft !== undefined && <span className="flex items-center gap-0.5"><Maximize2 className="h-3 w-3" />{selectedProperty.sqft.toLocaleString()} sqft</span>}
                      </div>
                      <button
                        onClick={() => onViewProperty(selectedProperty.id)}
                        className="mt-2 w-full py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                </InfoWindow>
              )}
            </GoogleMap>
          )}
          {!isLoaded && (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Loading map...
            </div>
          )}
        </LoadScript>
      </div>
    </div>
  );
}
