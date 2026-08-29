/**
 * Mascaramento de dados de contacto para apresentação na UI.
 * Nunca guardamos estes valores em auditoria — apenas os mostramos ao operador.
 */

export function maskPhone(phone?: string | null): string {
  if (!phone) return "—";
  const digits = phone.replace(/\D/g, "");
  if (digits.length <= 4) return "•".repeat(digits.length);
  const prefix = phone.trim().startsWith("+") ? "+" : "";
  return `${prefix}${digits.slice(0, 3)}${"•".repeat(Math.max(digits.length - 6, 2))}${digits.slice(-3)}`;
}

export function maskEmail(email?: string | null): string {
  if (!email) return "—";
  const [user, domain] = email.split("@");
  if (!domain) return "•••";
  const head = user.slice(0, 2);
  return `${head}${"•".repeat(Math.max(user.length - 2, 2))}@${domain}`;
}

/** Referência técnica de instância — mostra só os últimos caracteres. */
export function maskRef(ref?: string | null): string {
  if (!ref) return "não configurada";
  if (ref.length <= 4) return "••••";
  return `••••${ref.slice(-4)}`;
}
