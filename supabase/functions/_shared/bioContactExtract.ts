/**
 * Extração determinística de contactos de uma página "link na bio".
 * Só lê valores explícitos (wa.me, api.whatsapp.com, tel:, mailto:); nunca adivinha.
 * Espelhado em src/lib/prospecting/bioContactExtract.ts (teste de paridade).
 */
export interface BioContacts {
  phone: string | null;
  email: string | null;
}

const IGNORED_EMAIL = /(example\.|sentry|wixpress|@2x|\.png|\.jpg|\.webp|\.svg|noreply|no-reply)/i;

function validPhone(digits: string): string | null {
  const d = digits.replace(/\D/g, "");
  if (d.length < 9 || d.length > 15) return null;
  return d.length === 9 ? `351${d}` : d;
}

export function extractBioContacts(html: string): BioContacts {
  const text = html.replace(/&amp;/g, "&");
  let phone: string | null = null;

  const waPatterns = [
    /wa\.me\/\+?(\d[\d\s-]{7,18})/i,
    /api\.whatsapp\.com\/send\/?\?[^"'\s>]*phone=\+?(\d{8,15})/i,
    /whatsapp:\/\/send\?[^"'\s>]*phone=\+?(\d{8,15})/i,
  ];
  for (const re of waPatterns) {
    const m = text.match(re);
    if (m) { phone = validPhone(m[1]); if (phone) break; }
  }
  if (!phone) {
    const m = text.match(/href=["']tel:\s*\+?([\d\s().-]{9,20})["']/i);
    if (m) phone = validPhone(m[1]);
  }

  let email: string | null = null;
  const mail = text.match(/mailto:([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i);
  if (mail && !IGNORED_EMAIL.test(mail[1])) email = mail[1].toLowerCase();

  return { phone, email };
}

export function isSafePublicUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    const h = u.hostname.toLowerCase();
    if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal")) return false;
    if (/^(\d+\.){3}\d+$/.test(h) || h.includes(":")) return false; // sem IPs diretos
    return h.includes(".");
  } catch {
    return false;
  }
}
