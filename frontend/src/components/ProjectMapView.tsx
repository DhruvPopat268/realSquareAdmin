import { useState } from "react";
import { GoogleMap, LoadScript, Marker, InfoWindow } from "@react-google-maps/api";
import { Eye, MapPin, Calendar } from "lucide-react";
import type { Project, ProjectStage, ListingStatus } from "@/data/projectsData";
import { PROJECT_STAGE_LABEL, LISTING_STATUS_LABEL } from "@/data/projectsData";

const stageStyle: Record<ProjectStage, string> = {
  PRE_LAUNCH:         "bg-purple-50 text-purple-600 border border-purple-200",
  NEW_LAUNCH:         "bg-blue-50 text-blue-600 border border-blue-200",
  UNDER_CONSTRUCTION: "bg-amber-50 text-amber-600 border border-amber-200",
  READY_TO_MOVE:      "bg-green-50 text-green-700 border border-green-200",
  SOLD_OUT:           "bg-gray-100 text-gray-600 border border-gray-200",
};

const listingStatusStyle: Record<ListingStatus, string> = {
  PENDING_APPROVAL: "bg-yellow-50 text-yellow-700 border border-yellow-200",
  ACTIVE:           "bg-green-50 text-green-700 border border-green-200",
  SOLD:             "bg-gray-100 text-gray-600 border border-gray-200",
  EXPIRED:          "bg-orange-50 text-orange-700 border border-orange-200",
  INACTIVE:         "bg-slate-100 text-slate-500 border border-slate-200",
  ARCHIVED:         "bg-stone-100 text-stone-500 border border-stone-200",
  REJECTED:         "bg-red-50 text-red-600 border border-red-200",
};

const progressColor: Record<ProjectStage, string> = {
  PRE_LAUNCH:         "bg-purple-400",
  NEW_LAUNCH:         "bg-blue-500",
  UNDER_CONSTRUCTION: "bg-amber-400",
  READY_TO_MOVE:      "bg-green-500",
  SOLD_OUT:           "bg-gray-400",
};

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  return `$${(n / 1_000).toFixed(0)}K`;
}

const mapContainerStyle = { width: "100%", height: "100%" };
const center = { lat: 37.0902, lng: -95.7129 };

export default function ProjectMapView({ projects, onViewProject }: { projects: Project[]; onViewProject: (id: number) => void }) {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "YOUR_API_KEY_HERE";
  const mapProjects = projects.slice(0, 5);

  return (
    <div className="flex gap-4 items-stretch" style={{ height: 1000 }}>
      {/* Left Panel */}
      <div className="w-96 h-full overflow-y-auto space-y-3 px-1 py-1">
        {mapProjects.map((p) => {
          const pctSold = Math.round((p.soldUnits / p.totalUnits) * 100);
          return (
            <div
              key={p.id}
              className={`bg-card rounded-lg border overflow-hidden cursor-pointer transition-all ${
                hoveredId === p.id ? "ring-2 ring-blue-500 shadow-lg" : "hover:shadow-md"
              }`}
              onMouseEnter={() => setHoveredId(p.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => setSelectedProject(p)}
            >
              <div className="relative h-32">
                <img src={p.images[0]} alt={p.title} className="w-full h-full object-cover" />
                <div className="absolute top-2 left-2 flex gap-1">
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${stageStyle[p.stage]}`}>{PROJECT_STAGE_LABEL[p.stage]}</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${listingStatusStyle[p.listingStatus]}`}>{LISTING_STATUS_LABEL[p.listingStatus]}</span>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); onViewProject(p.id); }}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-white/90 hover:bg-green-50 text-green-600 transition-colors"
                >
                  <Eye className="h-3 w-3" />
                </button>
              </div>
              <div className="p-3">
                <p className="text-sm font-bold text-foreground">{fmt(p.priceFrom)} – {fmt(p.priceTo)}</p>
                <p className="text-xs font-semibold text-foreground mt-0.5 line-clamp-1">{p.title}</p>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-1">
                  <MapPin className="h-2.5 w-2.5 shrink-0" />{p.city}
                </div>
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>{p.soldUnits}/{p.totalUnits} units</span>
                    <span>{pctSold}%</span>
                  </div>
                  <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${progressColor[p.stage]}`} style={{ width: `${p.progress}%` }} />
                  </div>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-2">
                  <Calendar className="h-2.5 w-2.5" />{p.possessionDate}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Right Panel - Map */}
      <div className="flex-1 h-full rounded-lg border overflow-hidden">
        <LoadScript googleMapsApiKey={apiKey} onLoad={() => setIsLoaded(true)}>
          {isLoaded && (
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={center}
              zoom={4}
              options={{ zoomControl: true, streetViewControl: false, mapTypeControl: false, fullscreenControl: true, mapTypeId: "hybrid" }}
            >
              {mapProjects.map((p) => {
                const label = fmt(p.priceFrom);
                const w = Math.max(60, label.length * 10 + 24);
                const fill = hoveredId === p.id ? "#3b82f6" : "#1f2937";
                return (
                  <Marker
                    key={p.id}
                    position={{ lat: p.lat, lng: p.lng }}
                    onClick={() => setSelectedProject(p)}
                    onMouseOver={() => setHoveredId(p.id)}
                    onMouseOut={() => setHoveredId(null)}
                    icon={{
                      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`<svg width="${w}" height="32" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="${w - 4}" height="28" rx="14" fill="${fill}" stroke="#fff" stroke-width="2"/><text x="${w / 2}" y="21" font-size="12" font-weight="bold" fill="#fff" text-anchor="middle" font-family="Arial,sans-serif">${label}</text></svg>`)}`,
                      scaledSize: new window.google.maps.Size(w, 32),
                      anchor: new window.google.maps.Point(w / 2, 32),
                    }}
                  />
                );
              })}

              {selectedProject && (
                <InfoWindow
                  position={{ lat: selectedProject.lat, lng: selectedProject.lng }}
                  onCloseClick={() => setSelectedProject(null)}
                >
                  <div className="w-64">
                    <img src={selectedProject.images[0]} alt={selectedProject.title} className="w-full h-32 object-cover rounded-t" />
                    <div className="p-2">
                      <div className="flex items-center gap-1 mb-1">
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${stageStyle[selectedProject.stage]}`}>{PROJECT_STAGE_LABEL[selectedProject.stage]}</span>
                      </div>
                      <p className="text-sm font-bold">{fmt(selectedProject.priceFrom)} – {fmt(selectedProject.priceTo)}</p>
                      <p className="text-xs font-semibold mt-0.5">{selectedProject.title}</p>
                      <p className="text-[10px] text-gray-600 mt-1">{selectedProject.city}</p>
                      <p className="text-[10px] text-gray-500">{selectedProject.developer.company}</p>
                      <button
                        onClick={() => onViewProject(selectedProject.id)}
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
            <div className="flex items-center justify-center h-full text-muted-foreground">Loading map...</div>
          )}
        </LoadScript>
      </div>
    </div>
  );
}
