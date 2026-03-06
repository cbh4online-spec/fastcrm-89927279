/**
 * Utility to clean raw email content from MIME boundaries, headers, and artifacts.
 * Two modes:
 * - preview: truncated to maxLength chars, for conversation list
 * - full: no truncation, for thread view
 */

// MIME boundary pattern: ------=_Part_123_456.789 or similar
const MIME_BOUNDARY_RE = /^-{2,}=?_?[A-Za-z]*_?\d.*$/gm;

// MIME headers
const MIME_HEADER_RE = /^(Content-Type|MIME-Version|Content-Transfer-Encoding|Content-Disposition|Content-ID|X-[\w-]+|Message-ID|Date|From|To|Cc|Bcc|Subject|Return-Path|Received|Reply-To|In-Reply-To|References):.*$/gim;

// Multiline MIME header continuation (starts with whitespace after a header)
const MIME_HEADER_CONTINUATION_RE = /^\s+(?:boundary|charset|name|filename|format|type)=.*$/gim;

// Quoted reply lines (> prefix)
const QUOTED_REPLY_RE = /^>+\s?.*$/gm;

// Common email reply headers
const REPLY_HEADER_RE = /^(On\s.+wrote:|Em\s.+escreveu:|De:\s|Enviado:\s|Para:\s|Assunto:\s|Sent:\s|From:\s|To:\s|Subject:\s).*$/gim;

// Base64 encoded blocks (long strings of alphanumeric chars)
const BASE64_BLOCK_RE = /^[A-Za-z0-9+/=]{76,}$/gm;

/**
 * Strip MIME artifacts from email content
 */
function stripMimeArtifacts(text: string): string {
  if (!text) return '';

  let cleaned = text;

  // Remove MIME boundaries
  cleaned = cleaned.replace(MIME_BOUNDARY_RE, '');

  // Remove MIME headers
  cleaned = cleaned.replace(MIME_HEADER_RE, '');
  cleaned = cleaned.replace(MIME_HEADER_CONTINUATION_RE, '');

  // Remove base64 blocks
  cleaned = cleaned.replace(BASE64_BLOCK_RE, '');

  // Remove charset/boundary declarations that might be inline
  cleaned = cleaned.replace(/charset=\"[^\"]*\"/gi, '');
  cleaned = cleaned.replace(/boundary=\"[^\"]*\"/gi, '');

  return cleaned;
}

/**
 * Extract plain text from HTML content
 */
function htmlToPlainText(html: string): string {
  try {
    // Use DOMParser if available (browser)
    if (typeof DOMParser !== 'undefined') {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      // Remove script/style elements
      doc.querySelectorAll('script, style').forEach(el => el.remove());
      return doc.body?.textContent || '';
    }
  } catch {
    // Fallback: strip tags with regex
  }
  return html.replace(/<[^>]+>/g, ' ');
}

/**
 * Detect if text contains HTML
 */
function containsHtml(text: string): boolean {
  return /<\/?(?:div|p|br|span|a|table|tr|td|html|body|head|h[1-6]|ul|ol|li|img|strong|em|b|i)[^>]*>/i.test(text);
}

/**
 * Collapse whitespace and trim
 */
function normalizeWhitespace(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .split('\n')
    .map(line => line.trim())
    .filter((line, i, arr) => !(line === '' && i > 0 && arr[i - 1] === ''))
    .join('\n')
    .trim();
}

/**
 * Clean email content for preview display (conversation list)
 * Returns a single-line truncated string
 */
export function cleanEmailPreview(content: string | null | undefined, maxLength = 100): string {
  if (!content) return '';

  let text = content;

  // If HTML, extract text
  if (containsHtml(text)) {
    text = htmlToPlainText(text);
  }

  // Strip MIME
  text = stripMimeArtifacts(text);

  // Remove quoted replies for preview
  text = text.replace(QUOTED_REPLY_RE, '');
  text = text.replace(REPLY_HEADER_RE, '');

  // Normalize
  text = normalizeWhitespace(text);

  // Single line for preview
  text = text.replace(/\n/g, ' ').replace(/\s{2,}/g, ' ').trim();

  // Truncate
  if (text.length > maxLength) {
    text = text.substring(0, maxLength).trimEnd() + '…';
  }

  return text;
}

/**
 * Clean email content for full thread view
 * Preserves structure but removes MIME artifacts
 */
export function cleanEmailContent(content: string | null | undefined): string {
  if (!content) return '';

  let text = content;

  // Strip MIME artifacts (but keep HTML if present)
  if (!containsHtml(text)) {
    text = stripMimeArtifacts(text);
    text = normalizeWhitespace(text);
  } else {
    // For HTML content, strip MIME outside of HTML tags
    const htmlMatch = text.match(/<html[\s\S]*<\/html>/i) || text.match(/<body[\s\S]*<\/body>/i);
    if (htmlMatch) {
      text = htmlMatch[0];
    }
  }

  return text;
}
