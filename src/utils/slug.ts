import slugify from "slugify";

/**
 * Generate a URL-safe slug from a string.
 * Handles Portuguese accents and special characters.
 */
export function toSlug(text: string): string {
  return slugify(text, {
    lower: true,
    strict: true,
    locale: "pt",
  });
}
