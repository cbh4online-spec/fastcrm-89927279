import type {
  VoiceProviderAdapter,
  VoiceCapabilities,
  ClickToCallInput,
  ClickToCallResult,
  NormalizedCallEvent,
  ProviderRuntimeConfig,
  CostEstimateInput,
  CostEstimateResult,
} from "./types";
import { normalizePhone } from "../utils/phone";
import { getDefaultCapabilities } from "../utils/providerCapabilities";
import { estimateCallCost } from "../utils/costEstimator";
import { normalizeGenericStatus } from "../normalize/normalizeCallStatus";

/**
 * 3CX Call Control API Adapter — estrutura preparada (REST + WebSocket).
 * Configuração:
 *  - baseUrl: PBX URL
 *  - apiToken via secret
 *  - settings: { client_id/dn, route_point, monitored_extensions, websocket_url }
 */
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
  const latencyMs = Date.now() - start;
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  return { ok: res.ok, status: res.status, data, latencyMs };
}

class ThreeCxAdapter implements VoiceProviderAdapter {
  readonly name = "threecx" as const;
  readonly capabilities: VoiceCapabilities = getDefaultCapabilities("threecx");

  async testConnection(config: ProviderRuntimeConfig) {
    try {
      // Endpoint indicativo — validar com Call Control API real
      const r = await threecxFetch("/callcontrol", { method: "GET" }, config);
      return {
        ok: r.ok,
        message: r.ok ? "Ligação 3CX OK." : `3CX respondeu ${r.status}.`,
        latencyMs: r.latencyMs,
        detectedCapabilities: r.ok ? this.capabilities : undefined,
      };
    } catch (e: any) {
      return { ok: false, message: e?.message ?? "Erro 3CX." };
    }
  }

  async clickToCall(input: ClickToCallInput, config: ProviderRuntimeConfig): Promise<ClickToCallResult> {
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
        message: "Chamada 3CX iniciada.",
        raw: r.data,
      };
    } catch (e: any) {
      return { success: false, status: "failed", message: e?.message ?? "Erro 3CX." };
    }
  }

  async endCall(providerCallId: string, config: ProviderRuntimeConfig) {
    const r = await threecxFetch(`/callcontrol/calls/${encodeURIComponent(providerCallId)}/drop`, { method: "POST" }, config);
    return { success: r.ok };
  }

  async getCallStatus(providerCallId: string, config: ProviderRuntimeConfig) {
    const r = await threecxFetch(`/callcontrol/calls/${encodeURIComponent(providerCallId)}`, { method: "GET" }, config);
    return { status: normalizeGenericStatus(r.data?.status), raw: r.data };
  }

  parseIncomingWebhook(payload: unknown): NormalizedCallEvent | null {
    if (!payload || typeof payload !== "object") return null;
    const p = payload as any;
    return {
      providerCallId: String(p.callid ?? p.id ?? "unknown"),
      eventType: "call.initiated",
      direction: "inbound",
      status: normalizeGenericStatus(p.status ?? "ringing"),
      fromNumber: p.caller,
      toNumber: p.callee,
      providerRawStatus: p.status,
      raw: payload,
    };
  }

  parseStatusWebhook(payload: unknown): NormalizedCallEvent | null {
    if (!payload || typeof payload !== "object") return null;
    const p = payload as any;
    const status = normalizeGenericStatus(p.status);
    return {
      providerCallId: String(p.callid ?? p.id ?? "unknown"),
      eventType: status === "completed" ? "call.completed" : "call.ringing",
      direction: (p.direction as any) ?? "outbound",
      status,
      durationSeconds: p.duration ? Number(p.duration) : undefined,
      raw: payload,
    };
  }

  parseRecordingWebhook(payload: unknown): NormalizedCallEvent | null {
    if (!payload || typeof payload !== "object") return null;
    const p = payload as any;
    return {
      providerCallId: String(p.callid ?? "unknown"),
      eventType: "recording.available",
      direction: "outbound",
      status: "recorded",
      recordingUrl: p.recording_url,
      raw: payload,
    };
  }

  async getRecording() { return { status: "not_available" }; }

  estimateCost(input: CostEstimateInput): CostEstimateResult {
    return estimateCallCost(input);
  }

  getCapabilities() { return this.capabilities; }
  normalizePhoneNumber(number: string, country: string = "PT") {
    return normalizePhone(number, country);
  }
}

export const threecxAdapter = new ThreeCxAdapter();
