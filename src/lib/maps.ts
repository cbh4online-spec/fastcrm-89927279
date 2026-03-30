/**
 * Google Maps initialization helper.
 * Uses VITE_GOOGLE_MAPS_API_KEY from env (publishable key, safe in codebase).
 */

export const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? "";

export const DEFAULT_MAP_CENTER = { lat: 38.7223, lng: -9.1393 }; // Lisboa
export const DEFAULT_MAP_ZOOM = 12;

export const mapContainerStyle = {
  width: "100%",
  height: "100%",
} as const;

export const mapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: true,
};
