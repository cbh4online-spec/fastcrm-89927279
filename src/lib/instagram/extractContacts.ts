/**
 * Extração de contactos públicos a partir do texto de uma biografia de Instagram.
 * Nunca inventa dados: devolve null quando nada é encontrado.
 */

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

// Telefones: E.164 ou formatos nacionais PT com 9 dígitos.
const PHONE_RE = /(\+\d{1,3}[\s.-]?)?(\d[\d\s.\-()]{7,16}\d)/g;

const WHATSAPP_RE = /(?:wa\.me|api\.whatsapp\.com\/send\?phone=)\/?(\+?\d{6,15})/i;

export interface ExtractedContacts {
  email: string | null;
  phone: string | null;
  /** "bio" quando extraído do texto, "whatsapp_link" quando de um link wa.me. */
  source: "bio" | "whatsapp_link" | null;
}

function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/[^\d+]/g, "");
  const plus = digits.startsWith("+");
  const onlyDigits = digits.replace(/\D/g, "");

  if (onlyDigits.length < 9 || onlyDigits.length > 15) return null;

  if (plus) return `+${onlyDigits}`;
  // 9 dígitos a começar por 9/2 => número nacional português
  if (onlyDigits.length === 9 && /^[293]/.test(onlyDigits)) return `+351${onlyDigits}`;
  if (onlyDigits.length === 12 && onlyDigits.startsWith("351")) return `+${onlyDigits}`;
  return `+${onlyDigits}`;
}

/** Remove sequências que são claramente datas ou anos, não telefones. */
function looksLikePhone(raw: string): boolean {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 9) return false;
  if (/^(19|20)\d{2}$/.test(digits)) return false;
  return true;
}

export function extractContactsFromBio(
  bio?: string | null,
  externalUrl?: string | null,
): ExtractedContacts {
  const text = `${bio ?? ""}\n${externalUrl ?? ""}`;

  let email: string | null = null;
  const emails = text.match(EMAIL_RE);
  if (emails && emails.length > 0) email = emails[0].toLowerCase();

  let phone: string | null = null;
  let source: ExtractedContacts["source"] = null;

  const wa = text.match(WHATSAPP_RE);
  if (wa?.[1]) {
    phone = normalizePhone(wa[1]);
    if (phone) source = "whatsapp_link";
  }

  if (!phone) {
    const matches = text.match(PHONE_RE) ?? [];
    for (const m of matches) {
      if (!looksLikePhone(m)) continue;
      const normalized = normalizePhone(m);
      if (normalized) {
        phone = normalized;
        source = "bio";
        break;
      }
    }
  }

  if (!phone && email) source = "bio";

  return { email, phone, source: email || phone ? source ?? "bio" : null };
}
