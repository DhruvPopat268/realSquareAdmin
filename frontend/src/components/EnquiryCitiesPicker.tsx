import { useEffect, useRef, useState } from "react";
import { useJsApiLoader } from "@react-google-maps/api";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";

const LIBRARIES: ("places")[] = ["places"];

interface Props {
  value: string[];
  onChange: (cities: string[]) => void;
}

export default function EnquiryCitiesPicker({ value, onChange }: Props) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES,
  });
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const autocomplete = useRef<google.maps.places.AutocompleteService | null>(null);

  useEffect(() => {
    if (isLoaded && !autocomplete.current) {
      autocomplete.current = new google.maps.places.AutocompleteService();
    }
  }, [isLoaded]);

  function handleQueryChange(nextQuery: string) {
    setQuery(nextQuery);
    if (!nextQuery.trim() || !autocomplete.current) {
      setSuggestions([]);
      return;
    }
    autocomplete.current.getPlacePredictions(
      { input: nextQuery },
      (predictions) => setSuggestions(predictions || [])
    );
  }

  function addCity(prediction: google.maps.places.AutocompletePrediction) {
    const city = prediction.structured_formatting?.main_text || prediction.description.split(",")[0];
    if (!value.some((existing) => existing.toLowerCase() === city.toLowerCase())) {
      onChange([...value, city]);
    }
    setQuery("");
    setSuggestions([]);
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Input
          value={query}
          onChange={(event) => handleQueryChange(event.target.value)}
          placeholder={isLoaded ? "Search for a city..." : "Loading Google Maps..."}
          disabled={!isLoaded}
          autoComplete="off"
        />
        {suggestions.length > 0 && (
          <ul className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-md border bg-background text-sm shadow-md">
            {suggestions.map((suggestion) => (
              <li key={suggestion.place_id}>
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => addCity(suggestion)}
                  className="w-full px-3 py-2 text-left hover:bg-muted"
                >
                  {suggestion.description}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((city) => (
            <span key={city} className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs">
              {city}
              <button
                type="button"
                aria-label={`Remove ${city}`}
                onClick={() => onChange(value.filter((item) => item !== city))}
                className="rounded-full text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
