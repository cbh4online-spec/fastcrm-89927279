// _shared/voice/adapters.ts — adapter dispatch para edge functions (Deno).
import {
  type VoiceProviderAdapter,
  type VoiceProviderName,
  type ProviderRuntimeConfig,
  type ClickToCallInput,
  type ClickToCallResult,
  type NormalizedCallEvent,
  type CallStatus,
  type ConnectionTestResult,
  type VoiceWebhookKind,
  normalizeTwilioStatus,
  normalizeGenericStatus,
  statusToEvent,
} from "./types.ts";

// ---------------- MOCK ----------------
const mockAdapter: VoiceProviderAdapter = {
  name: "mock",
  async testConnection() {
    return { ok: true, message: "Mock provider sempre disponível.", latencyMs: 1 };
  },
  async clickToCall(input) {
    const startedAt = new Date();
    const duration = 30 + Math.floor(Math.random() * 151);
    const endedAt = new Date(startedAt.getTime() + duration * 1000);
    return {
      success: true,
      providerCallId: `mock_${crypto.randomUUID()}`,
      status: "completed",
      durationSeconds: duration,
      startedAt: startedAt.toISOString(),
      endedAt: endedAt.toISOString(),
      message: "Chamada simulada (modo demonstração).",
      isMock: true,
      raw: { input, simulated: true },
    };
  },
  async getCallStatus(providerCallId) {
    return { status: "completed", raw: { providerCallId, mock: true } };
  },
  parseWebhook(_kind, payload) {
    if (!payload || typeof payload !== "object") return null;
    const p = payload as Record<string, unknown>;
    const status = normalizeGenericStatus((p.status as string) ?? "completed");
    return {
      providerCallId: String(p.call_id ?? `mock_${Date.now()}`),
      eventType: statusToEvent(status),
      direction: ((p.direction as string) === "inbound" ? "inbound" : "outbound"),
      status,
      fromNumber: p.from as string | undefined,
      toNumber: p.to as string | undefined,
      durationSeconds: typeof p.duration === "number" ? p.duration : undefined,
      raw: payload,
    };
  },
  async getRecording() { return { status: "not_available" }; },
};

// ---------------- TWILIO ----------------
const TWILIO_GW = "https://connector-gateway.lovable.dev/twilio";

async function twilioFetch(path: string, init: RequestInit) {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const twilioKey = Deno.env.get("TWILIO_API_KEY");
  if (!lovableKey) throw new Error("LOVABLE_API_KEY não configurada");
  if (!twilioKey) throw new Error("TWILIO_API_KEY não configurada — ligue o conector Twilio");
  const start = Date.now();
  const res = await fetch(`${TWILIO_GW}${path}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": twilioKey,
    },
  });
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  return { ok: res.ok, status: res.status, data, latencyMs: Date.now() - start };
}

const twilioAdapter: VoiceProviderAdapter = {
  name: "twilio",
  async testConnection() {
    try {
      const r = await twilioFetch("/IncomingPhoneNumbers.json?PageSize=1", { method: "GET" });
      return { ok: r.ok, message: r.ok ? "Ligação Twilio OK." : `Twilio ${r.status}`, latencyMs: r.latencyMs };
    } catch (e: any) {
      return { ok: false, message: e?.message ?? "Erro Twilio." };
    }
  },
  async clickToCall(input, config) {
    const settings = config.settings as Record<string, any>;
    const params = new URLSearchParams();
    params.set("To", input.toNumber);
    params.set("From", input.fromNumber);
    params.set("Twiml", `<Response><Say language="pt-PT">A ligar pela FastCRM VoiceHub.</Say></Response>`);
    if (settings.status_callback_url) {
      params.set("StatusCallback", settings.status_callback_url);
      ["initiated","ringing","answered","completed"].forEach(s => params.append("StatusCallbackEvent", s));
      params.set("StatusCallbackMethod", "POST");
    }
    if (input.record && settings.recording_callback_url) {
      params.set("Record", "true");
      params.set("RecordingStatusCallback", settings.recording_callback_url);
    }
    try {
      const r = await twilioFetch("/Calls.json", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      });
      if (!r.ok) return { success: false, status: "failed", message: `Twilio ${r.status}`, raw: r.data };
      return {
        success: true,
        providerCallId: r.data?.sid,
        status: normalizeTwilioStatus(r.data?.status),
        startedAt: r.data?.date_created,
        message: "Chamada iniciada.",
        raw: r.data,
      };
    } catch (e: any) {
      return { success: false, status: "failed", message: e?.message ?? "Erro Twilio." };
    }
  },
  async getCallStatus(providerCallId) {
    const r = await twilioFetch(`/Calls/${encodeURIComponent(providerCallId)}.json`, { method: "GET" });
    return { status: normalizeTwilioStatus(r.data?.status), raw: r.data };
  },
  parseWebhook(kind, payload) {
    if (!payload || typeof payload !== "object") return null;
    const p = payload as any;
    if (kind === "recording" || p.RecordingSid) {
      return {
        providerCallId: String(p.CallSid ?? "unknown"),
        eventType: "recording.available",
        direction: "outbound",
        status: "recorded",
        recordingUrl: p.RecordingUrl,
        recordingProviderId: p.RecordingSid,
        recordingDurationSeconds: p.RecordingDuration ? Number(p.RecordingDuration) : undefined,
        raw: payload,
      };
    }
    const status = normalizeTwilioStatus(p.CallStatus);
    return {
      providerCallId: String(p.CallSid ?? p.ParentCallSid ?? "unknown"),
      parentProviderCallId: p.ParentCallSid ? String(p.ParentCallSid) : undefined,
      eventType: statusToEvent(status),
      direction: String(p.Direction ?? "outbound").includes("inbound") ? "inbound" : "outbound",
      status,
      fromNumber: p.From,
      toNumber: p.To,
      durationSeconds: p.CallDuration ? Number(p.CallDuration) : undefined,
      providerRawStatus: p.CallStatus,
      raw: payload,
    };
  },
  async getRecording(providerCallId) {
    const r = await twilioFetch(`/Calls/${encodeURIComponent(providerCallId)}/Recordings.json`, { method: "GET" });
    const rec = r.data?.recordings?.[0];
    if (!rec) return { status: "not_available" };
    return {
      status: "available",
      url: `https://api.twilio.com${rec.uri?.replace(".json", ".mp3") ?? ""}`,
      durationSeconds: rec.duration ? Number(rec.duration) : undefined,
    };
  },
};

// ---------------- NVOIP ----------------
async function nvoipFetch(path: string, init: RequestInit, config: ProviderRuntimeConfig) {
  if (!config.baseUrl) throw new Error("Nvoip baseUrl não configurada.");
  if (!config.apiToken) throw new Error("Nvoip apiToken não configurado.");
  const start = Date.now();
  const res = await fetch(`${config.baseUrl.replace(/\/$/, "")}${path}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      Authorization: `Bearer ${config.apiToken}`,
      "Content-Type": "application/json",
    },
  });
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  return { ok: res.ok, status: res.status, data, latencyMs: Date.now() - start };
}

const nvoipAdapter: VoiceProviderAdapter = {
  name: "nvoip",
  async testConnection(config) {
    try {
      const r = await nvoipFetch("/account", { method: "GET" }, config);
      return { ok: r.ok, message: r.ok ? "Ligação Nvoip OK." : `Nvoip ${r.status}`, latencyMs: r.latencyMs };
    } catch (e: any) { return { ok: false, message: e?.message ?? "Erro Nvoip." }; }
  },
  async clickToCall(input, config) {
    try {
      const r = await nvoipFetch("/calls", {
        method: "POST",
        body: JSON.stringify({ from: input.fromNumber, to: input.toNumber, record: !!input.record }),
      }, config);
      if (!r.ok) return { success: false, status: "failed", message: `Nvoip ${r.status}`, raw: r.data };
      return {
        success: true,
        providerCallId: r.data?.id ?? r.data?.call_id,
        status: normalizeGenericStatus(r.data?.status ?? "initiated"),
        message: "Chamada Nvoip iniciada.",
        raw: r.data,
      };
    } catch (e: any) {
      return { success: false, status: "failed", message: e?.message ?? "Erro Nvoip." };
    }
  },
  async getCallStatus(providerCallId, config) {
    const r = await nvoipFetch(`/calls/${encodeURIComponent(providerCallId)}`, { method: "GET" }, config);
    return { status: normalizeGenericStatus(r.data?.status), raw: r.data };
  },
  parseWebhook(kind, payload) {
    if (!payload || typeof payload !== "object") return null;
    const p = payload as any;
    if (kind === "recording" || p.recording_url) {
      return {
        providerCallId: String(p.call_id ?? "unknown"),
        eventType: "recording.available",
        direction: "outbound",
        status: "recorded",
        recordingUrl: p.recording_url,
        recordingProviderId: p.recording_id,
        raw: payload,
      };
    }
    const status = normalizeGenericStatus(p.status);
    return {
      providerCallId: String(p.call_id ?? p.id ?? "unknown"),
      eventType: statusToEvent(status),
      direction: (p.direction as any) ?? (kind === "incoming" ? "inbound" : "outbound"),
      status,
      fromNumber: p.from,
      toNumber: p.to,
      durationSeconds: p.duration ? Number(p.duration) : undefined,
      providerRawStatus: p.status,
      raw: payload,
    };
  },
  async getRecording(providerCallId, config) {
    const r = await nvoipFetch(`/calls/${encodeURIComponent(providerCallId)}/recording`, { method: "GET" }, config);
    if (!r.ok) return { status: "not_available" };
    return { status: "available", url: r.data?.url, durationSeconds: r.data?.duration };
  },
};

// ---------------- 3CX ----------------
async function threecxFetch(path: string, init: RequestInit, config: ProviderRuntimeConfig) {
  if (!config.baseUrl) throw new Error("3CX baseUrl não configurada.");
  if (!config.apiToken) throw new Error("3CX apiToken não configurado.");
  const start = Date.now();
  const res = await fetch(`${config.baseUrl.replace(/\/$/, "")}${path}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      Authorization: `Bearer ${config.apiToken}`,
      "Content-Type": "application/json",
    },
  });
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  return { ok: res.ok, status: res.status, data, latencyMs: Date.now() - start };
}

const threecxAdapter: VoiceProviderAdapter = {
  name: "threecx",
  async testConnection(config) {
    try {
      const r = await threecxFetch("/callcontrol", { method: "GET" }, config);
      return { ok: r.ok, message: r.ok ? "Ligação 3CX OK." : `3CX ${r.status}`, latencyMs: r.latencyMs };
    } catch (e: any) { return { ok: false, message: e?.message ?? "Erro 3CX." }; }
  },
  async clickToCall(input, config) {
    const dn = (config.settings as any)?.client_id ?? (config.settings as any)?.dn;
    if (!dn) return { success: false, status: "failed", message: "3CX: configurar client_id/dn." };
    try {
      const r = await threecxFetch(`/callcontrol/${encodeURIComponent(dn)}/makecall`, {
        method: "POST",
        body: JSON.stringify({ destination: input.toNumber }),
      }, config);
      if (!r.ok) return { success: false, status: "failed", message: `3CX ${r.status}`, raw: r.data };
      return {
        success: true,
        providerCallId: String(r.data?.callid ?? r.data?.id ?? ""),
        status: normalizeGenericStatus(r.data?.status ?? "initiated"),
        raw: r.data,
      };
    } catch (e: any) {
      return { success: false, status: "failed", message: e?.message ?? "Erro 3CX." };
    }
  },
  async getCallStatus(providerCallId, config) {
    const r = await threecxFetch(`/callcontrol/calls/${encodeURIComponent(providerCallId)}`, { method: "GET" }, config);
    return { status: normalizeGenericStatus(r.data?.status), raw: r.data };
  },
  parseWebhook(kind, payload) {
    if (!payload || typeof payload !== "object") return null;
    const p = payload as any;
    const status = normalizeGenericStatus(p.status);
    return {
      providerCallId: String(p.callid ?? p.id ?? "unknown"),
      eventType: statusToEvent(status),
      direction: (p.direction as any) ?? (kind === "incoming" ? "inbound" : "outbound"),
      status,
      fromNumber: p.caller,
      toNumber: p.callee,
      durationSeconds: p.duration ? Number(p.duration) : undefined,
      raw: payload,
    };
  },
  async getRecording() { return { status: "not_available" }; },
};

// ---------------- SIP / placeholders ----------------
function placeholderAdapter(name: VoiceProviderName): VoiceProviderAdapter {
  return {
    name,
    async testConnection() { return { ok: false, message: `Adapter ${name} não suportado nesta fase.` }; },
    async clickToCall() { return { success: false, status: "failed", message: `Provider ${name} não suportado.` }; },
    async getCallStatus() { return { status: "failed" as CallStatus }; },
    parseWebhook() { return null; },
    async getRecording() { return { status: "not_available" }; },
  };
}

const ADAPTERS: Record<VoiceProviderName, VoiceProviderAdapter> = {
  mock: mockAdapter,
  twilio: twilioAdapter,
  nvoip: nvoipAdapter,
  threecx: threecxAdapter,
  sip: placeholderAdapter("sip"),
  zenvia: placeholderAdapter("zenvia"),
  totalvoice: placeholderAdapter("totalvoice"),
  vozio: placeholderAdapter("vozio"),
  voip_do_brasil: placeholderAdapter("voip_do_brasil"),
  asterisk: placeholderAdapter("asterisk"),
  other: placeholderAdapter("other"),
};

export function getAdapter(name: string): VoiceProviderAdapter {
  return ADAPTERS[(name as VoiceProviderName)] ?? mockAdapter;
}

/**
 * Constrói o ProviderRuntimeConfig a partir de uma row de voice_provider_instances,
 * resolvendo secrets via Deno.env (per-workspace usando api_*_secret_name).
 */
export function buildRuntimeConfig(instance: any): ProviderRuntimeConfig {
  const apiKey = instance.api_key_secret_name ? Deno.env.get(instance.api_key_secret_name) : null;
  const apiToken = instance.api_token_secret_name ? Deno.env.get(instance.api_token_secret_name) : null;
  return {
    providerName: instance.provider_name,
    providerInstanceId: instance.id,
    workspaceId: instance.workspace_id,
    baseUrl: instance.base_url,
    accountId: instance.account_id,
    apiKey: apiKey ?? null,
    apiToken: apiToken ?? null,
    authType: instance.auth_type,
    webhookToken: instance.webhook_token,
    defaultCountry: instance.default_country ?? "PT",
    defaultCountryCode: instance.default_country_code ?? "+351",
    defaultCurrency: instance.default_currency ?? "EUR",
    environment: instance.environment ?? "production",
    settings: instance.settings ?? {},
  };
}

export function estimateCost(opts: {
  durationSeconds: number;
  costPerMinute?: number | null;
  connectionFee?: number | null;
  billingIncrementSeconds?: number | null;
  currency?: string | null;
}): { amount: number | null; currency: string } {
  const currency = opts.currency ?? "EUR";
  if (opts.costPerMinute === undefined || opts.costPerMinute === null) {
    return { amount: null, currency };
  }
  const inc = Math.max(1, opts.billingIncrementSeconds ?? 60);
  const billable = opts.durationSeconds > 0 ? Math.ceil(opts.durationSeconds / inc) * inc : inc;
  const variable = (billable / 60) * opts.costPerMinute;
  const fee = opts.connectionFee ?? 0;
  return { amount: +(variable + fee).toFixed(4), currency };
}
