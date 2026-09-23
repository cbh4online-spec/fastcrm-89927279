/**
 * Resolução de conteúdo de etapa + canais suportados na Fase 1.
 * A UI grava WhatsApp em `whatsapp_template`; email em `subject` + `body_html`.
 * `content` (jsonb) é aceite como fallback ({ text } / { body } / { subject }).
 */

export const SUPPORTED_CHANNELS = ["email", "whatsapp"] as const;
export type SupportedChannel = (typeof SUPPORTED_CHANNELS)[number];

export interface StepLike {
  id: string;
  step_order: number;
  channel: string;
  subject?: string | null;
  body_html?: string | null;
  whatsapp_template?: string | null;
  content?: unknown;
  delay_days?: number | null;
  delay_hours?: number | null;
}

export type ResolvedContent =
  | { ok: true; channel: "email"; subject: string; html: string }
  | { ok: true; channel: "whatsapp"; text: string }
  | { ok: false; reason: string };

function contentField(c: unknown, key: string): string {
  if (c && typeof c === "object" && typeof (c as Record<string, unknown>)[key] === "string") {
    return ((c as Record<string, unknown>)[key] as string).trim();
  }
  return "";
}

export function hasUnresolvedVariables(s: string): boolean {
  return /\{\{\s*[\w.-]+\s*\}\}/.test(s);
}

export function renderVariables(s: string, vars: Record<string, string | null | undefined>): string {
  return s.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (raw, key: string) => {
    const v = vars[key];
    return typeof v === "string" && v.trim() ? v.trim() : raw;
  });
}

export function isSupportedChannel(ch: string): ch is SupportedChannel {
  return (SUPPORTED_CHANNELS as readonly string[]).includes(ch);
}

export function resolveStepContent(step: StepLike, vars: Record<string, string | null | undefined>): ResolvedContent {
  if (!isSupportedChannel(step.channel)) return { ok: false, reason: `unsupported_channel:${step.channel}` };

  if (step.channel === "email") {
    const subject = renderVariables((step.subject ?? "").trim() || contentField(step.content, "subject"), vars);
    const html = renderVariables((step.body_html ?? "").trim() || contentField(step.content, "body"), vars);
    if (!subject || !html) return { ok: false, reason: "empty_email_content" };
    if (hasUnresolvedVariables(subject) || hasUnresolvedVariables(html)) return { ok: false, reason: "unresolved_variables" };
    return { ok: true, channel: "email", subject, html };
  }

  const raw = (step.whatsapp_template ?? "").trim() || contentField(step.content, "text") || contentField(step.content, "body");
  // Texto simples: remove eventuais tags HTML herdadas.
  const text = renderVariables(raw, vars).replace(/<[^>]*>/g, "").trim();
  if (!text) return { ok: false, reason: "empty_whatsapp_content" };
  if (hasUnresolvedVariables(text)) return { ok: false, reason: "unresolved_variables" };
  return { ok: true, channel: "whatsapp", text };
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

/** Rodapé de cancelamento com link tokenizado (sem email/IDs em URL). */
export function appendUnsubscribeFooter(html: string, unsubscribeUrl: string): string {
  if (html.includes("data-sdr-compliance-footer")) return html;
  return `${html}
<div data-sdr-compliance-footer="1" style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;line-height:1.5;">
  <p>Se não deseja receber mais comunicações, pode <a href="${escapeHtml(unsubscribeUrl)}" style="color:#6b7280;text-decoration:underline;">cancelar a subscrição aqui</a>.</p>
</div>`;
}
