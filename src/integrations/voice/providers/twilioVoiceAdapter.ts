import type {
  VoiceProviderAdapter,
  VoiceCapabilities,
  ClickToCallInput,
  ClickToCallResult,
  NormalizedCallEvent,
  CallStatus,
  ProviderRuntimeConfig,
  CostEstimateInput,
  CostEstimateResult,
  CallEventType,
} from "./types";
import { normalizePhone } from "../utils/phone";
import { getDefaultCapabilities } from "../utils/providerCapabilities";
import { estimateCallCost } from "../utils/costEstimator";
import { normalizeTwilioStatus } from "../normalize/normalizeCallStatus";

/**
 * Twilio Voice Adapter — usa Lovable Connector Gateway (Twilio gateway).
 * Account SID é injetado automaticamente pelo gateway.
 * Não chama directamente api.twilio.com — todas as requisições passam pelo gateway.
 *
 * Configuração esperada em settings:
 *  - status_callback_url, recording_callback_url, edge (opcional)
 */
const GATEWAY_URL = "https://connector-gateway.lovable.dev/twilio";

async function twilioFetch(
  path: string,
  init: RequestInit,
  config: ProviderRuntimeConfig,
): Promise<{ ok: boolean; status: number; data: any; latencyMs: number }> {
  const lovableKey = (globalThis as any).Deno?.env.get("LOVABLE_API_KEY");
  const twilioKey = (globalThis as any).Deno?.env.get("TWILIO_API_KEY");
  if (!lovableKey) throw new Error("LOVABLE_API_KEY não configurada");
  if (!twilioKey) throw new Error("TWILIO_API_KEY não configurada — ligue o conector Twilio");

  const start = Date.now();
  const res = await fetch(`${GATEWAY_URL}${path}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": twilioKey,
    },
  });
  const latencyMs = Date.now() - start;
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  return { ok: res.ok, status: res.status, data, latencyMs };
}

class TwilioVoiceAdapter implements VoiceProviderAdapter {
  readonly name = "twilio" as const;
  readonly capabilities: VoiceCapabilities = getDefaultCapabilities("twilio");

  async testConnection(config: ProviderRuntimeConfig) {
    try {
      // GET /IncomingPhoneNumbers.json é leve; o gateway adiciona /2010-04-01/Accounts/{Sid}
      const r = await twilioFetch("/IncomingPhoneNumbers.json?PageSize=1", { method: "GET" }, config);
      if (!r.ok) {
        return { ok: false, message: `Twilio respondeu ${r.status}: ${JSON.stringify(r.data)?.slice(0, 200)}`, latencyMs: r.latencyMs };
      }
      return { ok: true, message: "Ligação Twilio OK.", latencyMs: r.latencyMs, detectedCapabilities: this.capabilities };
    } catch (e: any) {
      return { ok: false, message: e?.message ?? "Erro Twilio." };
    }
  }

  async clickToCall(input: ClickToCallInput, config: ProviderRuntimeConfig): Promise<ClickToCallResult> {
    const settings = config.settings as Record<string, any>;
    const statusCallback = settings.status_callback_url as string | undefined;
    const recordingCallback = settings.recording_callback_url as string | undefined;

    const params = new URLSearchParams();
    params.set("To", input.toNumber);
    params.set("From", input.fromNumber);
    // TwiML mínimo — produção real usa Url=app TwiML. Para já usamos Twiml inline para abrir e desligar.
    params.set("Twiml", `<Response><Say language="pt-PT">A ligar pela FastCRM VoiceHub.</Say></Response>`);
    if (statusCallback) {
      params.set("StatusCallback", statusCallback);
      ["initiated","ringing","answered","completed"].forEach(s => params.append("StatusCallbackEvent", s));
      params.set("StatusCallbackMethod", "POST");
    }
    if (input.record && recordingCallback) {
      params.set("Record", "true");
      params.set("RecordingStatusCallback", recordingCallback);
    }

    try {
      const r = await twilioFetch("/Calls.json", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      }, config);
      if (!r.ok) {
        return { success: false, status: "failed", message: `Twilio ${r.status}: ${JSON.stringify(r.data)?.slice(0, 200)}`, raw: r.data };
      }
      return {
        success: true,
        providerCallId: r.data?.sid,
        status: normalizeTwilioStatus(r.data?.status),
        startedAt: r.data?.date_created,
        message: "Chamada iniciada via Twilio.",
        raw: r.data,
      };
    } catch (e: any) {
      return { success: false, status: "failed", message: e?.message ?? "Erro Twilio." };
    }
  }

  async endCall(providerCallId: string, config: ProviderRuntimeConfig) {
    const params = new URLSearchParams({ Status: "completed" });
    const r = await twilioFetch(`/Calls/${encodeURIComponent(providerCallId)}.json`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    }, config);
    return { success: r.ok, message: r.ok ? "Chamada terminada." : `Erro ${r.status}` };
  }

  async getCallStatus(providerCallId: string, config: ProviderRuntimeConfig) {
    const r = await twilioFetch(`/Calls/${encodeURIComponent(providerCallId)}.json`, { method: "GET" }, config);
    return { status: normalizeTwilioStatus(r.data?.status), raw: r.data };
  }

  private parseTwilioCallback(payload: any, eventType: CallEventType): NormalizedCallEvent | null {
    if (!payload || typeof payload !== "object") return null;
    const status = normalizeTwilioStatus(payload.CallStatus);
    return {
      providerCallId: String(payload.CallSid ?? payload.ParentCallSid ?? "unknown"),
      parentProviderCallId: payload.ParentCallSid ? String(payload.ParentCallSid) : undefined,
      eventType,
      direction: (String(payload.Direction ?? "outbound").includes("inbound") ? "inbound" : "outbound"),
      status,
      fromNumber: payload.From,
      toNumber: payload.To,
      durationSeconds: payload.CallDuration ? Number(payload.CallDuration) : undefined,
      providerRawStatus: payload.CallStatus,
      raw: payload,
    };
  }

  parseIncomingWebhook(payload: unknown): NormalizedCallEvent | null {
    return this.parseTwilioCallback(payload, "call.initiated");
  }

  parseStatusWebhook(payload: unknown): NormalizedCallEvent | null {
    const p = payload as any;
    const status = normalizeTwilioStatus(p?.CallStatus);
    let event: CallEventType = "call.completed";
    if (status === "ringing") event = "call.ringing";
    else if (status === "in_progress") event = "call.answered";
    else if (status === "no_answer" || status === "busy") event = "call.missed";
    else if (status === "failed" || status === "cancelled") event = "call.failed";
    else if (status === "completed") event = "call.completed";
    return this.parseTwilioCallback(payload, event);
  }

  parseRecordingWebhook(payload: unknown): NormalizedCallEvent | null {
    if (!payload || typeof payload !== "object") return null;
    const p = payload as any;
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

  async getRecording(providerCallId: string, config: ProviderRuntimeConfig) {
    const r = await twilioFetch(`/Calls/${encodeURIComponent(providerCallId)}/Recordings.json`, { method: "GET" }, config);
    const rec = r.data?.recordings?.[0];
    if (!rec) return { status: "not_available" };
    return {
      status: "available",
      url: `https://api.twilio.com${rec.uri?.replace(".json", ".mp3") ?? ""}`,
      durationSeconds: rec.duration ? Number(rec.duration) : undefined,
    };
  }

  estimateCost(input: CostEstimateInput): CostEstimateResult {
    return estimateCallCost(input);
  }

  getCapabilities() { return this.capabilities; }

  normalizePhoneNumber(number: string, country: string = "PT") {
    return normalizePhone(number, country);
  }
}

export const twilioVoiceAdapter = new TwilioVoiceAdapter();
