/**
 * Returns the correct public base URL for the project.
 * When running on Lovable preview/dev domains, falls back to the published custom domain.
 */
export function getPublicBaseUrl(): string {
  const hostname = window.location.hostname;
  if (hostname.includes("lovable.app") || hostname.includes("lovableproject.com")) {
    return "https://fastcrm.lovable.app";
  }
  return window.location.origin;
}
