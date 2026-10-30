/**
 * Abre uma conversa no WhatsApp Web reutilizando sempre o mesmo separador.
 *
 * - Usa `web.whatsapp.com/send` (sem a página intermédia do wa.me).
 * - Usa um nome de janela fixo, por isso o browser reaproveita o separador aberto pelo FastCRM.
 * - Com a extensão FastCRM WhatsApp Pro (≥0.8.0), o pedido é redirecionado para o separador
 *   do WhatsApp Web que o utilizador já tem aberto, evitando o aviso «aberto noutra janela».
 */
export const WHATSAPP_WEB_WINDOW_NAME = "fastcrm-whatsapp-web";

export function buildWhatsAppWebUrl(phone: string, text?: string): string | null {
  let digits = (phone || "").replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (/^[239]\d{8}$/.test(digits)) digits = `351${digits}`;
  if (digits.length < 8 || digits.length > 15) return null;
  const params = new URLSearchParams({ phone: digits });
  if (text && text.trim()) params.set("text", text);
  return `https://web.whatsapp.com/send?${params.toString()}`;
}

export function openWhatsAppChat(phone: string, text?: string): boolean {
  const url = buildWhatsAppWebUrl(phone, text);
  if (!url) return false;
  const win = window.open(url, WHATSAPP_WEB_WINDOW_NAME);
  try { win?.focus(); } catch { /* ignorado */ }
  return true;
}
