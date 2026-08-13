import slugify from "slugify";

/** Comprimento máximo por defeito para slugs públicos (SEO + partilha). */
export const DEFAULT_SLUG_MAX_LENGTH = 70;

/**
 * Generate a URL-safe slug from a string.
 * Handles Portuguese accents and special characters.
 * Corta por palavra (nunca a meio) até `maxLength`.
 */
export function toSlug(text: string, maxLength: number = DEFAULT_SLUG_MAX_LENGTH): string {
  const slug = slugify(text || "", {
    lower: true,
    strict: true,
    locale: "pt",
  });

  if (!maxLength || slug.length <= maxLength) return slug;

  const cut = slug.slice(0, maxLength);
  const lastDash = cut.lastIndexOf("-");
  // Se o corte por palavra ainda deixar um slug utilizável, usa-o.
  return (lastDash > 20 ? cut.slice(0, lastDash) : cut).replace(/-+$/, "");
}
