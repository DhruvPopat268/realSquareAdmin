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

/**
 * Reverse geocode the given lat/lng and verify that the user-sent cityName
 * matches the city returned by Google.  Also verifies the locality address
 * belongs to that city.
 *
 * @param {string} cityName  — the city name the user selected (e.g. from CityAutocomplete)
 * @param {object} locality  — { address, latitude, longitude }
 * @returns {Promise<{ city: string, state: string }>}
 * @throws  Error with a user-friendly message when validation fails
 */
const verifyCityAndLocality = async (cityName, locality) => {
  if (!cityName || typeof cityName !== "string" || !cityName.trim()) {
    throw makeLocationError("cityName is required.");
  }

  if (!locality?.address || typeof locality.address !== "string" || !locality.address.trim()) {
    throw makeLocationError("A selected locality address is required for location verification.");
  }

  if (locality.latitude === undefined || locality.latitude === null || locality.latitude === "" ||
      locality.longitude === undefined || locality.longitude === null || locality.longitude === "") {
    throw makeLocationError("A valid locality latitude and longitude are required for city verification.");
  }

  const latitude = Number(locality.latitude);
  const longitude = Number(locality.longitude);

  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
      !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw makeLocationError("A valid locality latitude and longitude are required for city verification.");
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw makeLocationError("Location verification is not configured. Please contact support.", 503);
  }

  let result;
  try {
    const params = new URLSearchParams({ latlng: `${latitude},${longitude}`, key: apiKey });
    const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${params}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error(`Geocoding HTTP ${response.status}`);
    result = await response.json();
  } catch (error) {
    if (error.statusCode) throw error;
    throw makeLocationError("Could not verify the location. Please choose a more specific location and try again.");
  }

  if (result.status !== "OK" || !result.results?.length) {
    throw makeLocationError("Could not verify the location. Please choose a more specific location and try again.");
  }

  // Find the most complete address result (must have at least 3 components and a state)
  const bestResult = result.results.find((geocodeResult) => {
    const components = geocodeResult.address_components;
    return Array.isArray(components) && components.length >= MIN_ADDRESS_COMPONENTS &&
      components.some((component) => component.types?.includes("administrative_area_level_1"));
  }) ?? result.results[0];

  const components = bestResult.address_components ?? [];

  // Extract city — prefer "locality", fall back to "administrative_area_level_2"
  const cityComponent =
    components.find((component) => component.types?.includes("locality")) ??
    components.find((component) => component.types?.includes("administrative_area_level_2"));

  if (!cityComponent) {
    throw makeLocationError("Could not determine the city from the selected location. Please choose a more specific location.");
  }

  const geocodedCity = cityComponent.long_name.trim();
  const sentCity = cityName.trim();
  const geocodedCityLower = geocodedCity.toLowerCase();
  const sentCityLower = sentCity.toLowerCase();

  // Strict match first, then allow substring in either direction for spelling variants
  const matches =
    geocodedCityLower === sentCityLower ||
    geocodedCityLower.includes(sentCityLower) ||
    sentCityLower.includes(geocodedCityLower);

  if (!matches) {
    throw makeLocationError(
      `The selected locality belongs to "${geocodedCity}", not "${sentCity}". Please select a locality within ${sentCity}.`
    );
  }

  // A reverse lookup validates the coordinates and city in one Google API
  // request. Also require the submitted address label to identify that same
  // city, so a label from a different city cannot be paired with these coords.
  const normalizeAddress = (value) => value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  const normalizedAddress = normalizeAddress(locality.address);
  const normalizedGeocodedCity = normalizeAddress(geocodedCity);
  if (!normalizedAddress.includes(normalizedGeocodedCity)) {
    throw makeLocationError(
      `The selected address does not identify the city returned for its coordinates ("${geocodedCity}"). Please select an address within ${geocodedCity}.`
    );
  }

  // Extract state (informational — returned for consistency with resolveProfileLocation)
  const state = components.find((component) =>
    component.types?.includes("administrative_area_level_1"))?.long_name?.trim() ?? null;

  return { city: geocodedCity, state };
};

module.exports = { resolveProfileLocation, resolveRequiredProfileLocation, verifyCityAndLocality };
