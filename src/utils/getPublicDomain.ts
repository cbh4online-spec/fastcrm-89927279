/**
 * Returns the correct public base URL for the project.
 * When running on Lovable preview/dev domains, falls back to the published custom domain.
 */
export function getPublicBaseUrl(): string {
  const hostname = window.location.hostname.toLowerCase();

  // In preview/dev environments, use the published app URL for public links.
  if (hostname.includes("id-preview") || hostname.includes("lovableproject.com")) {
    return "https://fastcrm.lovable.app";
  }

  return window.location.origin;
}
