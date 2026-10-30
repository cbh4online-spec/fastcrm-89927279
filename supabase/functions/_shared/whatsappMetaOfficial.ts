// Adapter WhatsApp Business oficial (Meta) via Connector Gateway.
// Só é usado quando a instância activa do workspace é `meta_cloud_api`;
// a ligação Meta pertence a um único workspace (metadata.allowed_workspace_id).

export const META_GATEWAY_URL = "https://connector-gateway.lovable.dev/whatsapp";

export type MetaInstance = {
  id: string;
  workspace_id: string;
  provider_name: string;
  active: boolean;
  metadata?: Record<string, unknown> | null;
};

/** Fail-closed: a instância tem de estar activa, ser Meta e estar presa a este workspace. */
export function isMetaInstanceAllowed(inst: MetaInstance | null | undefined, workspaceId: string): boolean {
  if (!inst || !inst.active || inst.provider_name !== "meta_cloud_api") return false;
  if (inst.workspace_id !== workspaceId) return false;
  const allowed = (inst.metadata ?? {})["allowed_workspace_id"];
  return typeof allowed === "string" && allowed === workspaceId;
}

/** E.164 só com dígitos, sem "+"; números PT de 9 dígitos ganham 351. */
export function toMetaRecipient(phone: string | null | undefined): string | null {
  let d = (phone ?? "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length === 9 && /^[29]/.test(d)) d = `351${d}`;
  return d.length >= 8 && d.length <= 15 ? d : null;
}

export type MetaErrorInfo = { code: string; message: string };

/** Traduz erros da Meta para PT-PT simples. */
export function describeMetaError(status: number, bodyText: string): MetaErrorInfo {
  let metaCode: number | undefined;
  try { metaCode = JSON.parse(bodyText)?.error?.code; } catch { /* texto simples */ }
  if (metaCode === 131047 || metaCode === 131026 && false) {
    return { code: "OUTSIDE_24H", message: "Passaram mais de 24 h desde a última mensagem deste cliente. A Meta só aceita modelos aprovados — use «Abrir no WhatsApp Web»." };
  }
  if (metaCode === 131026 || metaCode === 100) {
    return { code: "INVALID_RECIPIENT", message: "Este número não pode receber mensagens WhatsApp." };
  }
  if (metaCode === 131048 || metaCode === 131056 || metaCode === 130429 || status === 429) {
    return { code: "RATE_LIMITED", message: "A Meta limitou os envios deste número por agora. Tente mais tarde." };
  }
  if (metaCode === 131031 || metaCode === 368) {
    return { code: "ACCOUNT_RESTRICTED", message: "A conta WhatsApp Business está restrita pela Meta." };
  }
  return { code: "META_ERROR", message: `A Meta recusou o envio (${status}).` };
}

export async function sendMetaText(to: string, text: string): Promise<
  { ok: true; messageId: string | null } | { ok: false; status: number; info: MetaErrorInfo; raw: string }
> {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const waKey = Deno.env.get("WHATSAPP_API_KEY");
  if (!lovableKey || !waKey) {
    return { ok: false, status: 500, info: { code: "NOT_CONFIGURED", message: "Linha oficial WhatsApp não configurada no servidor." }, raw: "" };
  }
  const res = await fetch(`${META_GATEWAY_URL}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": waKey, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { body: text } }),
  });
  const raw = await res.text();
  if (!res.ok) {
    console.error(`[meta-send] failed [${res.status}]: ${raw.slice(0, 500)}`);
    return { ok: false, status: res.status, info: describeMetaError(res.status, raw), raw };
  }
  let messageId: string | null = null;
  try { messageId = JSON.parse(raw)?.messages?.[0]?.id ?? null; } catch { /* noop */ }
  return { ok: true, messageId };
}
