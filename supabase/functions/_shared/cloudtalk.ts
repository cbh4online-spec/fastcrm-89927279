// Shared CloudTalk helpers (REST API: https://my.cloudtalk.io/api, HTTP Basic auth).
export const CLOUDTALK_API = "https://my.cloudtalk.io/api";

export function cloudtalkAuthHeader(keyId: string, keySecret: string): string {
  return "Basic " + btoa(`${keyId}:${keySecret}`);
}

/** Normalises a CloudTalk webhook payload into the fields we persist. Unknown shapes return null. */
export function normalizeCloudtalkCall(payload: Record<string, unknown>) {
  const p = (payload?.data && typeof payload.data === "object" ? payload.data : payload) as Record<string, any>;
  const id = p.call_id ?? p.callId ?? p.call_uuid ?? p.uuid ?? p.id;
  if (id === undefined || id === null || String(id).length === 0) return null;
  const num = (v: unknown) => (v === undefined || v === null || v === "" ? null : Number(v));
  const str = (v: unknown, max = 300) => (v === undefined || v === null ? null : String(v).slice(0, max));
  const rawDir = String(p.direction ?? p.call_type ?? p.type ?? "").toLowerCase();
  const direction = rawDir.includes("out") ? "outbound" : rawDir.includes("in") ? "inbound" : null;
  const started = p.started_at ?? p.start_time ?? p.call_start ?? p.created_at;
  const startedIso = started ? new Date(String(started)).toISOString() : null;
  const duration = num(p.talking_time ?? p.call_duration ?? p.duration ?? p.billsec);
  return {
    external_call_id: String(id).slice(0, 120),
    direction,
    status: str(p.status ?? p.call_status ?? payload?.event ?? payload?.type, 60),
    external_number: str(p.external_number ?? p.contact_number ?? p.customer_number ?? p.caller_number ?? p.callee_number, 40),
    agent_name: str(p.agent_name ?? p.agent?.name ?? p.agent_full_name, 120),
    duration_seconds: Number.isFinite(duration) ? Math.max(0, Math.round(duration as number)) : null,
    started_at: startedIso && !Number.isNaN(Date.parse(startedIso)) ? startedIso : null,
    recording_url: str(p.recording_url ?? p.recording_link ?? p.recording, 1000),
  };
}
