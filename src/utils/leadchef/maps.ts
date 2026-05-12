/**
 * Helpers para construir links de navegação a partir de uma morada.
 * Aceita qualquer string livre (rua, cidade, código postal).
 */

export interface AddressParts {
  address?: string | null;
  city?: string | null;
  postalCode?: string | null;
}

export function composeAddress(parts: AddressParts): string {
  return [parts.address, parts.postalCode, parts.city]
    .map((s) => (s ?? "").trim())
    .filter(Boolean)
    .join(", ");
}

export function hasAddress(parts: AddressParts): boolean {
  return composeAddress(parts).length > 0;
}

/** Google Maps — universal (web + apps móveis fazem deep-link). */
export function buildGoogleMapsUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/** Waze — abre app se instalada, caso contrário fallback web. */
export function buildWazeUrl(query: string): string {
  return `https://waze.com/ul?q=${encodeURIComponent(query)}&navigate=yes`;
}

/** Apple Maps — funciona em iOS/macOS; em outros sistemas faz fallback web. */
export function buildAppleMapsUrl(query: string): string {
  return `https://maps.apple.com/?q=${encodeURIComponent(query)}`;
}
