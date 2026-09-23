/**
 * Fronteira de envio do modo worker (SDR Fase 1).
 * A assinatura HMAC só prova a origem e expira em 120 s; NÃO impede replay.
 * Cada transporte consome atomicamente um recibo único por
 * (tentativa, despacho, transporte) via sdr_consume_transport_token, que também
 * verifica workspace, canal, destinatário, estado 'dispatching' e elegibilidade.
 * Envios manuais (utilizador autenticado) não passam por aqui.
 */
// deno-lint-ignore-file no-explicit-any
export type TransportStage = "email-send" | "whatsapp-pro-send" | "whatsapp-zapi-send";
export interface SdrBinding { attemptId: string; dispatchNo: number }

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseSdrBinding(raw: unknown): SdrBinding | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const dispatchNo = Number(r.dispatchNo);
  if (typeof r.attemptId !== "string" || !UUID_RE.test(r.attemptId)) return null;
  if (!Number.isInteger(dispatchNo) || dispatchNo < 1 || dispatchNo > 5) return null;
  return { attemptId: r.attemptId, dispatchNo };
}

export async function consumeWorkerDispatch(
  admin: any,
  i: { workspaceId: string; binding: SdrBinding | null; stage: TransportStage; channel: "email" | "whatsapp"; recipient: string | null | undefined },
): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!i.binding) return { ok: false, reason: "sdr_binding_required" };
  if (!i.recipient) return { ok: false, reason: "recipient_required" };
  const { data, error } = await admin.rpc("sdr_consume_transport_token", {
    p_workspace_id: i.workspaceId, p_attempt_id: i.binding.attemptId, p_dispatch_no: i.binding.dispatchNo,
    p_stage: i.stage, p_channel: i.channel, p_recipient: i.recipient,
  });
  if (error) return { ok: false, reason: "consume_failed" }; // fail-closed (inclui migração não aplicada)
  return data === "ok" ? { ok: true } : { ok: false, reason: String(data ?? "unknown") };
}
