export const FASTCRM_PUBLIC_CAREERS_SLUG = "metodopare";

const LEGACY_PUBLIC_CAREERS_SLUG_ALIASES: Record<string, string> = {
  fastcrm: FASTCRM_PUBLIC_CAREERS_SLUG,
};

export function resolvePublicCareersSlug(slug?: string) {
  if (!slug) return slug;
  return LEGACY_PUBLIC_CAREERS_SLUG_ALIASES[slug.toLowerCase()] ?? slug;
}
