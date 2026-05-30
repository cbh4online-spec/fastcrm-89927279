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

/**
 * Sanitize CSS for inline injection inside a <style> tag.
 * Blocks tag breakouts and dangerous CSS features (expression, javascript: urls,
 * @import, data: urls, behavior, -moz-binding).
 */
export function sanitizeCss(dirty: string): string {
  if (!dirty || typeof dirty !== "string") return "";
  let css = dirty;
  // Strip HTML comments and any tag-like sequences (prevents </style><script> breakout)
  css = css.replace(/<!--[\s\S]*?-->/g, "");
  css = css.replace(/<\/?[a-zA-Z][^>]*>/g, "");
  // Strip dangerous CSS constructs
  css = css.replace(/expression\s*\(/gi, "/*blocked*/(");
  css = css.replace(/javascript\s*:/gi, "/*blocked*/:");
  css = css.replace(/vbscript\s*:/gi, "/*blocked*/:");
  css = css.replace(/-moz-binding\s*:/gi, "/*blocked*/:");
  css = css.replace(/behavior\s*:/gi, "/*blocked*/:");
  css = css.replace(/@import\b[^;]*;?/gi, "");
  css = css.replace(/url\s*\(\s*['"]?\s*(javascript|data|vbscript)\s*:[^)]*\)/gi, "url(about:blank)");
  return css;
}

