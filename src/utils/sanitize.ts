import DOMPurify from "dompurify";

/**
 * Sanitize HTML string to prevent XSS attacks.
 * Uses DOMPurify with sensible defaults for rich-text content.
 */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
      "p", "br", "strong", "b", "em", "i", "u", "s", "del",
      "h1", "h2", "h3", "h4", "h5", "h6",
      "ul", "ol", "li",
      "a", "img",
      "blockquote", "pre", "code",
      "table", "thead", "tbody", "tr", "th", "td",
      "div", "span", "hr",
    ],
    ALLOWED_ATTR: [
      "href", "target", "rel", "src", "alt", "title",
      "class", "style", "width", "height",
      "colspan", "rowspan",
    ],
    ALLOW_DATA_ATTR: false,
  });
}

/**
 * Strip all HTML tags, returning plain text only.
 */
export function stripHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, { ALLOWED_TAGS: [] });
}
