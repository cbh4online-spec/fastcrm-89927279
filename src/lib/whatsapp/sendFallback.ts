import { FunctionsHttpError } from "@supabase/supabase-js";

/**
 * Lançado quando a linha WhatsApp do CRM não consegue enviar (ex.: Z-API desligado)
 * e o servidor indica `fallback: true`. A interface oferece então «Abrir no WhatsApp Web»
 * com o texto pré-preenchido. Nunca é usado para bloqueios (opt-out/permissões).
 */
export class WhatsAppWebFallbackError extends Error {
  readonly phone: string;
  readonly text: string;
  constructor(phone: string, text: string, reason: string) {
    super(`Linha WhatsApp do CRM indisponível (${reason}). Envie pelo WhatsApp Web.`);
    this.name = "WhatsAppWebFallbackError";
    this.phone = phone;
    this.text = text;
  }
}

/** Extrai o motivo real de um erro de edge function (corpo JSON ou texto). */
export async function readFunctionError(error: unknown, fallback: string): Promise<{ message: string; code?: string }> {
  try {
    const ctx = (error as { context?: Response })?.context;
    if (error instanceof FunctionsHttpError || (ctx && typeof ctx.text === "function")) {
      const raw = await (ctx as Response).clone().text();
      try {
        const body = JSON.parse(raw);
        return { message: body?.error || body?.message || fallback, code: body?.code };
      } catch {
        return { message: raw || fallback };
      }
    }
  } catch { /* ignorado */ }
  return { message: (error as Error)?.message || fallback };
}
