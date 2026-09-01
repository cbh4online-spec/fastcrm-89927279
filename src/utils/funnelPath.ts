export interface FunnelPublicPath {
  slug: string;
  path: string;
}

export function normalizeFunnelPublicPath(input: string): FunnelPublicPath | null {
  const pathValue = input.trim().replace(/^\/+|\/+$/g, "");

  // Public funnels are served by the single `/funnel/:slug` route.
  if (!pathValue || pathValue.includes("/")) return null;

  const slug = pathValue
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  if (slug.length < 3 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return null;
  }

  return { slug, path: `/${slug}` };
}
