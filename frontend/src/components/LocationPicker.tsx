import { useRef, useState } from "react";
import { useJsApiLoader } from "@react-google-maps/api";
import { Input } from "@/components/ui/input";
import { MapPin } from "lucide-react";

const LIBRARIES: ("places")[] = ["places"];

export interface LocationValue {
  name: string;
  latitude: number;
  longitude: number;
}

interface Props {
  value: LocationValue | null;
  onChange: (loc: LocationValue) => void;
}

export default function LocationPicker({ value, onChange }: Props) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES,
  });

  const [query, setQuery] = useState(value?.name || "");
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const autocomplete = useRef<google.maps.places.AutocompleteService | null>(null);
  const geocoder     = useRef<google.maps.Geocoder | null>(null);

  if (isLoaded && !autocomplete.current) {
    autocomplete.current = new google.maps.places.AutocompleteService();
    geocoder.current     = new google.maps.Geocoder();
  }

  function handleChange(q: string) {
    setQuery(q);
    if (!q.trim() || !autocomplete.current) { setSuggestions([]); return; }
    autocomplete.current.getPlacePredictions({ input: q }, (preds) => setSuggestions(preds || []));
  }

  function handleSelect(pred: google.maps.places.AutocompletePrediction) {
    setQuery(pred.description);
    setSuggestions([]);
    geocoder.current?.geocode({ placeId: pred.place_id }, (results) => {
      if (!results?.[0]) return;
      const loc = results[0].geometry.location;
      onChange({ name: pred.description, latitude: loc.lat(), longitude: loc.lng() });
    });
  }

  return (
    <div className="relative">
      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground z-10" />
      <Input
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Search location..."
        className="pl-8"
        disabled={!isLoaded}
      />
      {suggestions.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-md max-h-48 overflow-y-auto text-sm">
          {suggestions.map((s) => (
            <li
              key={s.place_id}
              onClick={() => handleSelect(s)}
              className="flex items-start gap-2 px-3 py-2 hover:bg-muted cursor-pointer"
            >
              <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
              <span>{s.description}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
