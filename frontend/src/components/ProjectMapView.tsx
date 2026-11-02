import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GoogleMap, InfoWindow, Marker, useJsApiLoader } from "@react-google-maps/api";
import { Eye, MapPin } from "lucide-react";
import { projectListingService, type ProjectMapFilters, type ProjectMapPin } from "@/services/projectListingService";

const INDIA_CENTER = { lat: 20.5937, lng: 78.9629 };
const MAP_OPTIONS: google.maps.MapOptions = {
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: false,
  clickableIcons: false,
};

function formatPrice(value?: number) {
  if (value == null) return "Price on request";
  if (value >= 10_000_000) return `₹${(value / 10_000_000).toFixed(2).replace(/\.?0+$/, "")} Cr`;
  if (value >= 100_000) return `₹${(value / 100_000).toFixed(2).replace(/\.?0+$/, "")} L`;
  return `₹${value.toLocaleString("en-IN")}`;
}

function formatPriceRange(project: ProjectMapPin) {
  if (project.minPrice == null && project.maxPrice == null) return "Price on request";
  return `${formatPrice(project.minPrice)} – ${formatPrice(project.maxPrice)}`;
}

function statusStyle(status: string) {
  if (status === "Active") return "bg-green-50 text-green-700 border-green-200";
  if (status === "UnderReview") return "bg-yellow-50 text-yellow-700 border-yellow-200";
  if (status === "Rejected") return "bg-red-50 text-red-600 border-red-200";
  if (status === "Sold" || status === "sold") return "bg-gray-100 text-gray-600 border-gray-200";
  return "bg-slate-100 text-slate-600 border-slate-200";
}

function ProjectInfo({ project, onView }: { project: ProjectMapPin; onView: () => void }) {
  const image = project.media?.images?.[0];
  return (
    <div className="w-60 overflow-hidden rounded-lg bg-white">
      {image ? <img src={image} alt={project.projectName} className="h-32 w-full object-cover" /> : <div className="flex h-32 items-center justify-center bg-muted text-xs text-muted-foreground">No project photo</div>}
      <div className="space-y-1.5 p-3">
        <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${statusStyle(project.status)}`}>{project.status === "UnderReview" ? "Under Review" : project.status === "sold" ? "Sold" : project.status}</span>
        <p className="text-sm font-bold text-gray-900">{formatPriceRange(project)}</p>
        <p className="line-clamp-2 text-xs font-semibold text-gray-800">{project.projectName}</p>
        <p className="flex items-start gap-1 text-[11px] text-gray-500"><MapPin className="mt-0.5 h-3 w-3 shrink-0" />{[project.locality?.address, project.cityName].filter(Boolean).join(", ") || "Location not provided"}</p>
        {project.developerName && <p className="text-[10px] text-gray-400">By {project.developerName}</p>}
        <button type="button" onClick={onView} className="inline-flex w-full items-center justify-center gap-1 rounded-md bg-green-50 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100">
          <Eye className="h-3.5 w-3.5" /> View Project
        </button>
      </div>
    </div>
  );
}

export default function ProjectMapView({ filters, onViewProject }: { filters: ProjectMapFilters; onViewProject: (id: string) => void }) {
  const [pins, setPins] = useState<ProjectMapPin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const { isLoaded } = useJsApiLoader({ googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? "" });

  const { categoryId, city, roleId, userId, status } = filters;
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    projectListingService.getMapPins({ categoryId, city, roleId, userId, status })
      .then(({ data }) => {
        if (!cancelled) setPins(data.data ?? []);
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load project map pins.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [categoryId, city, roleId, userId, status]);

  const onMapLoad = useCallback((map: google.maps.Map) => { mapRef.current = map; }, []);
  const pinsWithCoordinates = useMemo(
    () => pins.filter((pin) => pin.locality?.latitude != null && pin.locality?.longitude != null),
    [pins],
  );

  useEffect(() => {
    if (!mapRef.current || pinsWithCoordinates.length === 0 || !isLoaded) return;
    const bounds = new window.google.maps.LatLngBounds();
    pinsWithCoordinates.forEach((pin) => bounds.extend({ lat: pin.locality!.latitude!, lng: pin.locality!.longitude! }));
    mapRef.current.fitBounds(bounds, 80);
  }, [pinsWithCoordinates, isLoaded]);

  const selectedPin = pinsWithCoordinates.find((pin) => pin._id === selectedId) ?? null;

  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-border" style={{ height: "calc(100vh - 130px)" }}>
      {(loading || !isLoaded) && <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm"><div className="mb-3 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /><p className="text-sm text-muted-foreground">Loading map…</p></div>}
      {error && !loading && <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/90"><p className="text-sm text-red-500">{error}</p></div>}
      {!loading && !error && isLoaded && pinsWithCoordinates.length === 0 && <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center"><div className="flex flex-col items-center gap-2 rounded-2xl border border-gray-200 bg-white/95 px-8 py-6 shadow-lg backdrop-blur-sm"><MapPin className="h-8 w-8 text-muted-foreground" /><p className="text-sm font-semibold text-gray-700">No projects with location data</p><p className="text-xs text-muted-foreground">Projects need latitude and longitude to appear on the map.</p></div></div>}
      {!loading && pinsWithCoordinates.length > 0 && <div className="absolute right-4 top-4 z-10 rounded-full border border-gray-200 bg-white/95 px-3 py-1.5 shadow"><p className="text-xs font-semibold text-gray-700">{pinsWithCoordinates.length} project{pinsWithCoordinates.length === 1 ? "" : "s"}</p></div>}
      {isLoaded && <GoogleMap mapContainerStyle={{ width: "100%", height: "100%" }} center={INDIA_CENTER} zoom={5} options={MAP_OPTIONS} onLoad={onMapLoad} onClick={() => setSelectedId(null)}>
        {pinsWithCoordinates.map((pin) => {
          const position = { lat: pin.locality!.latitude!, lng: pin.locality!.longitude! };
          return <div key={pin._id}>
            {selectedPin?._id === pin._id && <InfoWindow position={position} onCloseClick={() => setSelectedId(null)}><ProjectInfo project={pin} onView={() => onViewProject(pin._id)} /></InfoWindow>}
            <Marker position={position} title={pin.projectName} onClick={() => setSelectedId(pin._id)} />
          </div>;
        })}
      </GoogleMap>}
    </div>
  );
}
