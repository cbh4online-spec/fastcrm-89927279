/**
 * Generates a share URL that goes through the og-proxy edge function.
 * This ensures crawlers (WhatsApp, Facebook, etc.) get proper OG meta tags.
 *
 * @param type - Page type: 'vertical', 'bio', 'landing', 'store', 'product'
 * @param slug - The slug(s) for the page. For bio/landing: "workspaceSlug/pageSlug"
 */
export function getShareUrl(type: string, slug: string): string {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || "eumnfkccyvlyoyjchiwe";
  return `https://${projectId}.supabase.co/functions/v1/og-proxy?type=${encodeURIComponent(type)}&slug=${encodeURIComponent(slug)}`;
}
