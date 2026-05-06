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
} from "./types";
import { normalizePhone } from "../utils/phone";
import { getDefaultCapabilities } from "../utils/providerCapabilities";
import { estimateCallCost } from "../utils/costEstimator";
import { normalizeGenericStatus } from "../normalize/normalizeCallStatus";

/**
 * Nvoip Adapter — preparado, não vinculado a endpoints fixos.
 * NOTA: Validar endpoints reais da Nvoip no momento de ativação em produção.
 * Configuração:
 *  - baseUrl (ex: https://api.nvoip.com.br/v1)
 *  - apiToken via secret
 *  - settings.from_number, settings.account_id
 */
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
  const latencyMs = Date.now() - start;
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  return { ok: res.ok, status: res.status, data, latencyMs };
}

class NvoipAdapter implements VoiceProviderAdapter {
  readonly name = "nvoip" as const;
  readonly capabilities: VoiceCapabilities = getDefaultCapabilities("nvoip");

  async testConnection(config: ProviderRuntimeConfig) {
    try {
      // Endpoint a validar em produção; usar healthcheck genérico.
      const r = await nvoipFetch("/account", { method: "GET" }, config);
      return {
        ok: r.ok,
        message: r.ok ? "Ligação Nvoip OK." : `Nvoip respondeu ${r.status}.`,
        latencyMs: r.latencyMs,
        detectedCapabilities: r.ok ? this.capabilities : undefined,
      };
    } catch (e: any) {
      return { ok: false, message: e?.message ?? "Erro Nvoip." };
    }
  }

  async clickToCall(input: ClickToCallInput, config: ProviderRuntimeConfig): Promise<ClickToCallResult> {
    try {
      // Estrutura genérica — endpoint exato deve ser validado com a Nvoip.
      const r = await nvoipFetch("/calls", {
        method: "POST",
        body: JSON.stringify({ from: input.fromNumber, to: input.toNumber, record: !!input.record }),
      }, config);
      if (!r.ok) {
        return { success: false, status: "failed", message: `Nvoip ${r.status}`, raw: r.data };
      }
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
  }

  async endCall(providerCallId: string, config: ProviderRuntimeConfig) {
    const r = await nvoipFetch(`/calls/${encodeURIComponent(providerCallId)}/hangup`, { method: "POST" }, config);
    return { success: r.ok };
  }

  async getCallStatus(providerCallId: string, config: ProviderRuntimeConfig) {
    const r = await nvoipFetch(`/calls/${encodeURIComponent(providerCallId)}`, { method: "GET" }, config);
    return { status: normalizeGenericStatus(r.data?.status), raw: r.data };
  }

  parseIncomingWebhook(payload: unknown): NormalizedCallEvent | null {
    if (!payload || typeof payload !== "object") return null;
    const p = payload as any;
    return {
      providerCallId: String(p.call_id ?? p.id ?? "unknown"),
      eventType: "call.initiated",
      direction: "inbound",
      status: normalizeGenericStatus(p.status ?? "ringing"),
      fromNumber: p.from,
      toNumber: p.to,
      providerRawStatus: p.status,
      raw: payload,
    };
  }

  parseStatusWebhook(payload: unknown): NormalizedCallEvent | null {
    if (!payload || typeof payload !== "object") return null;
    const p = payload as any;
    const status = normalizeGenericStatus(p.status);
    return {
      providerCallId: String(p.call_id ?? p.id ?? "unknown"),
      eventType: status === "completed" ? "call.completed" : status === "no_answer" ? "call.missed" : "call.ringing",
      direction: (p.direction as any) ?? "outbound",
      status,
      durationSeconds: p.duration ? Number(p.duration) : undefined,
      providerRawStatus: p.status,
      raw: payload,
    };
  }

  parseRecordingWebhook(payload: unknown): NormalizedCallEvent | null {
    if (!payload || typeof payload !== "object") return null;
    const p = payload as any;
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

  async getRecording(providerCallId: string, config: ProviderRuntimeConfig) {
    const r = await nvoipFetch(`/calls/${encodeURIComponent(providerCallId)}/recording`, { method: "GET" }, config);
    if (!r.ok) return { status: "not_available" };
    return { status: "available", url: r.data?.url, durationSeconds: r.data?.duration };
  }

  estimateCost(input: CostEstimateInput): CostEstimateResult {
    return estimateCallCost(input);
  }

  getCapabilities() { return this.capabilities; }

  normalizePhoneNumber(number: string, country: string = "PT") {
    return normalizePhone(number, country);
  }
}

export const nvoipAdapter = new NvoipAdapter();
