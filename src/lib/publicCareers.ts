export const FASTCRM_PUBLIC_CAREERS_SLUG = "fastcrm";

const PUBLIC_CAREERS_SLUG_TARGETS: Record<string, string> = {
  [FASTCRM_PUBLIC_CAREERS_SLUG]: "metodopare",
};

const CANONICAL_PUBLIC_CAREERS_SLUGS_BY_WORKSPACE: Record<string, string> = {
  metodopare: FASTCRM_PUBLIC_CAREERS_SLUG,
};

export function resolvePublicCareersSlug(slug?: string) {
  if (!slug) return slug;

  const normalizedSlug = slug.trim().toLowerCase();
  return PUBLIC_CAREERS_SLUG_TARGETS[normalizedSlug] ?? normalizedSlug;
}

export function getCanonicalPublicCareersSlug(slug?: string) {
  const resolvedSlug = resolvePublicCareersSlug(slug);
  if (!resolvedSlug) return resolvedSlug;

  return CANONICAL_PUBLIC_CAREERS_SLUGS_BY_WORKSPACE[resolvedSlug] ?? resolvedSlug;
}

export function buildPublicCareersPath(slug?: string, jobSlug?: string | null) {
  const publicSlug = getCanonicalPublicCareersSlug(slug);
  if (!publicSlug) return null;

  return jobSlug ? `/careers/${publicSlug}/${jobSlug}` : `/careers/${publicSlug}`;
}
