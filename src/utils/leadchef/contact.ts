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

export function buildWhatsAppHref(phone: string, message?: string): string {
  const clean = cleanPhoneNumber(phone).replace(/^\+/, "");
  if (!clean) return "#";
  const base = `https://wa.me/${clean}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
