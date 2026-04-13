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

/**
 * Returns the public base URL for C2C Marketplace pages.
 * The marketplace lives on vendesimples.com.
 */
export function getMarketplaceBaseUrl(): string {
  return "https://vendesimples.com";
}

/**
 * Returns the marketplace base URL from config's custom_domain if set,
 * otherwise falls back to the default vendesimples.com.
 */
export function getMarketplaceBaseUrlFromConfig(customDomain?: string | null): string {
  if (customDomain) {
    const domain = customDomain.replace(/^https?:\/\//, "").replace(/\/+$/, "");
    return `https://${domain}`;
  }
  return getMarketplaceBaseUrl();
}
