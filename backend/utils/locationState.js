const MIN_ADDRESS_COMPONENTS = 3;

const makeLocationError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const isNullValue = (value) =>
  value === null || (typeof value === "string" && value.trim().toLowerCase() === "null");

/**
 * Read a location sent as multipart dotted fields or as a nested JSON object.
 * Returns null when no location fields were included, otherwise validates the
 * complete location and derives its state from Google's geocoding response.
 */
const resolveProfileLocation = async (body = {}) => {
  const nested = body.location && typeof body.location === "object" ? body.location : {};
  const raw = {
    name: body["location.name"] ?? nested.name,
    latitude: body["location.latitude"] ?? nested.latitude,
    longitude: body["location.longitude"] ?? nested.longitude,
  };
  const hasLocation = Object.values(raw).some((value) => value !== undefined);
  if (!hasLocation) return null;

  if (Object.values(raw).some(isNullValue)) {
    throw makeLocationError("Location cannot be cleared for this profile. Provide a valid location.");
  }

  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  const latitude = Number(raw.latitude);
  const longitude = Number(raw.longitude);
  if (!name || raw.latitude === "" || raw.latitude === undefined || raw.longitude === "" || raw.longitude === undefined ||
      (typeof raw.latitude === "string" && !raw.latitude.trim()) ||
      (typeof raw.longitude === "string" && !raw.longitude.trim()) ||
      !Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
      !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw makeLocationError("A valid location name, latitude, and longitude are required.");
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw makeLocationError("Location state lookup is not configured. Please contact support.", 503);
  }

  try {
    const params = new URLSearchParams({ latlng: `${latitude},${longitude}`, key: apiKey });
    const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${params}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error(`Geocoding HTTP ${response.status}`);

    const result = await response.json();
    const addressComponents = result.results?.find((geocodeResult) => {
      const components = geocodeResult.address_components;
      return Array.isArray(components) && components.length >= MIN_ADDRESS_COMPONENTS &&
        components.some((component) => component.types?.includes("administrative_area_level_1"));
    })?.address_components;
    if (result.status !== "OK" || !addressComponents) {
      throw new Error("Geocoding did not return a complete address");
    }

    const state = addressComponents.find((component) =>
      component.types?.includes("administrative_area_level_1"))?.long_name?.trim();
    if (!state) throw new Error("Geocoding result did not include a state");

    return { location: { name, latitude, longitude }, state };
  } catch (error) {
    if (error.statusCode) throw error;
    throw makeLocationError("Could not determine the state from this location. Please choose a more specific location and try again.");
  }
};

const resolveRequiredProfileLocation = async (rawLocation) => {
  let location = rawLocation;
  if (typeof location === "string") {
    try {
      location = JSON.parse(location);
    } catch {
      throw makeLocationError("Location must be valid JSON.");
    }
  }

  if (!location || typeof location !== "object" || Array.isArray(location)) {
    throw makeLocationError("A valid location is required.");
  }

  const resolved = await resolveProfileLocation({ location });
  if (!resolved) throw makeLocationError("A valid location is required.");
  return resolved;
};

module.exports = { resolveProfileLocation, resolveRequiredProfileLocation };
