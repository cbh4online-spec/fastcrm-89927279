/**
 * Helpers de contacto para o módulo LeadChef.
 */

export function cleanPhoneNumber(phone: string): string {
  if (!phone) return "";
  return phone.replace(/[^\d+]/g, "");
}

export function buildTelHref(phone: string): string {
  const clean = cleanPhoneNumber(phone);
  return clean ? `tel:${clean}` : "#";
}

/**
 * Constrói URL wa.me. Se o telefone aparenta ser português (9 dígitos a começar
 * por 9/2/3) sem indicativo, prefixa 351 como fallback opcional.
 */
export function buildWhatsAppHref(phone: string, message?: string): string {
  let clean = cleanPhoneNumber(phone).replace(/^\+/, "");
  if (!clean) return "#";
  // Fallback PT: 9 dígitos, sem indicativo internacional
  if (/^[239]\d{8}$/.test(clean)) {
    clean = `351${clean}`;
  }
  const base = `https://wa.me/${clean}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

export async function copyToClipboard(text: string): Promise<void> {
  if (!text) throw new Error("Nada para copiar.");
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  // Fallback
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand("copy");
  } finally {
    document.body.removeChild(ta);
  }
}
