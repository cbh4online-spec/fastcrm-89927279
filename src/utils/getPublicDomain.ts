/**
 * Returns the correct public base URL for the project.
 * Preview/dev domains fall back to the custom domain; all others use origin.
 */
export function getPublicBaseUrl(): string {
  const hostname = window.location.hostname.toLowerCase();

  // Only fallback for Lovable preview/dev environments
  if (hostname.includes("id-preview") || hostname.includes("lovableproject.com") || hostname.includes("lovable.app")) {
    return "https://fastcrm.metodopare.ai";
  }

  return window.location.origin;
}
