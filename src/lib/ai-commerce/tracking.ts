/**
 * Tracking de AI Commerce — deteta e persiste a origem da visita (incluindo
 * motores de IA) e registra eventos do funil em `ai_commerce_events`.
 */
import { supabase } from "@/integrations/supabase/client";

const ATTRIBUTION_KEY = "ai_commerce_attribution";
const SESSION_KEY = "store_view_session_id";
const CONSENT_KEY = "gdpr_consent";

export type CommerceChannel =
  | "chatgpt"
  | "perplexity"
  | "gemini"
  | "copilot"
  | "claude"
  | "google"
  | "meta"
  | "referral"
  | "organic"
  | "direct";

export interface CommerceAttribution {
  source: string | null;
  medium: string | null;
  campaign: string | null;
  referrer: string | null;
  landing_page: string | null;
  channel: CommerceChannel;
  is_ai_channel: boolean;
  captured_at: string;
}

const AI_SOURCES: Record<string, CommerceChannel> = {
  chatgpt: "chatgpt",
  openai: "chatgpt",
  "chat.openai.com": "chatgpt",
  "chatgpt.com": "chatgpt",
  perplexity: "perplexity",
  "perplexity.ai": "perplexity",
  gemini: "gemini",
  "gemini.google.com": "gemini",
  bard: "gemini",
  copilot: "copilot",
  "copilot.microsoft.com": "copilot",
  claude: "claude",
  "claude.ai": "claude",
};

const SEARCH_HOSTS = ["google.", "bing.", "duckduckgo.", "search.brave."];
const META_HOSTS = ["facebook.", "instagram.", "fb.", "messenger."];

function hostOf(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/** Classifica canal a partir de UTMs e referrer. Nunca deduz o que não existe. */
export function resolveChannel(params: {
  source?: string | null;
  medium?: string | null;
  referrer?: string | null;
}): { channel: CommerceChannel; isAi: boolean } {
  const source = (params.source || "").toLowerCase().trim();
  const medium = (params.medium || "").toLowerCase().trim();

  if (source && AI_SOURCES[source]) return { channel: AI_SOURCES[source], isAi: true };

  const host = hostOf(params.referrer ?? null);
  if (host) {
    for (const [key, channel] of Object.entries(AI_SOURCES)) {
      if (key.includes(".") && host.includes(key)) return { channel, isAi: true };
    }
  }

  if (medium === "ai") return { channel: (source as CommerceChannel) || "chatgpt", isAi: true };

  if (source === "google" || (host && SEARCH_HOSTS.some((h) => host.includes(h)))) {
    return { channel: "google", isAi: false };
  }
  if (source === "meta" || source === "facebook" || source === "instagram" || (host && META_HOSTS.some((h) => host.includes(h)))) {
    return { channel: "meta", isAi: false };
  }
  if (host) return { channel: "referral", isAi: false };
  if (medium === "organic") return { channel: "organic", isAi: false };
  return { channel: "direct", isAi: false };
}

function analyticsAllowed(): boolean {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return true; // ainda não foi pedido consentimento
    const consent = JSON.parse(raw);
    return consent?.hasConsented ? !!consent.analytics : true;
  } catch {
    return true;
  }
}

const FIRST_TOUCH_KEY = "ai_commerce_first_touch";

function readJson<T>(store: Storage | null, key: string): T | null {
  if (!store) return null;
  try {
    const raw = store.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(store: Storage | null, key: string, value: unknown): void {
  if (!store) return;
  try {
    store.setItem(key, JSON.stringify(value));
  } catch {
    /* noop */
  }
}

/**
 * Captura a atribuição da visita.
 * - `first touch` fica em localStorage e nunca é sobrescrito.
 * - `last touch` fica em sessionStorage e é atualizado sempre que há novo sinal.
 */
export function captureAttribution(): CommerceAttribution | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const utmSource = params.get("utm_source");
  const utmMedium = params.get("utm_medium");
  const utmCampaign = params.get("utm_campaign");
  const referrer = document.referrer || null;

  const existing = getAttribution();
  const hasNewSignal = !!(utmSource || utmMedium || utmCampaign);

  let attribution = existing;
  if (!existing || hasNewSignal) {
    const { channel, isAi } = resolveChannel({ source: utmSource, medium: utmMedium, referrer });
    attribution = {
      source: utmSource,
      medium: utmMedium,
      campaign: utmCampaign,
      referrer,
      landing_page: window.location.pathname,
      channel,
      is_ai_channel: isAi,
      captured_at: new Date().toISOString(),
    };
    writeJson(window.sessionStorage, ATTRIBUTION_KEY, attribution);
  }

  // First touch — escrito uma única vez por dispositivo/navegador.
  if (attribution && !getFirstTouch()) {
    writeJson(window.localStorage, FIRST_TOUCH_KEY, attribution);
  }

  return attribution;
}

export function getAttribution(): CommerceAttribution | null {
  if (typeof window === "undefined") return null;
  return readJson<CommerceAttribution>(window.sessionStorage, ATTRIBUTION_KEY);
}

export function getFirstTouch(): CommerceAttribution | null {
  if (typeof window === "undefined") return null;
  return readJson<CommerceAttribution>(window.localStorage, FIRST_TOUCH_KEY);
}

/** Payload de atribuição enviado para o servidor (checkout/encomenda). */
export interface AttributionPayload {
  session_id: string | null;
  first_touch_source: string | null;
  first_touch_medium: string | null;
  first_touch_campaign: string | null;
  first_touch_channel: string | null;
  last_touch_source: string | null;
  last_touch_medium: string | null;
  last_touch_campaign: string | null;
  last_touch_channel: string | null;
}

export function attributionPayload(): AttributionPayload {
  const first = getFirstTouch();
  const last = getAttribution() ?? captureAttribution();
  return {
    session_id: currentSessionId(),
    first_touch_source: first?.source ?? null,
    first_touch_medium: first?.medium ?? null,
    first_touch_campaign: first?.campaign ?? null,
    first_touch_channel: first?.channel ?? null,
    last_touch_source: last?.source ?? null,
    last_touch_medium: last?.medium ?? null,
    last_touch_campaign: last?.campaign ?? null,
    last_touch_channel: last?.channel ?? null,
  };
}

function currentSessionId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

/** Eventos normalizados do funil AI Commerce. */
export type CommerceEventType =
  | "visit"
  | "commerce_page_view"
  | "product_view"
  | "product_click"
  | "lead"
  | "lead_created"
  | "add_to_cart"
  | "checkout_start"
  | "checkout_completed"
  | "purchase"
  | "subscription_started"
  | "subscription_renewed"
  | "subscription_cancelled";

/** Eventos que o navegador pode registar diretamente (sem valor monetário). */
const CLIENT_ALLOWED_EVENTS: CommerceEventType[] = [
  "visit",
  "commerce_page_view",
  "product_view",
  "product_click",
  "add_to_cart",
  "checkout_start",
];

export interface TrackCommerceEventInput {
  workspaceId: string;
  eventType: CommerceEventType;
  productId?: string | null;
  variantId?: string | null;
  orderId?: string | null;
  customerId?: string | null;
  value?: number | null;
  currency?: string | null;
  country?: string | null;
}

/**
 * Registo do evento no funil.
 *
 * Eventos com valor monetário (compra, subscrição, lead, checkout concluído)
 * NUNCA são aceites a partir do navegador: são delegados na Edge Function
 * `commerce-track`, que valida a encomenda real e é idempotente.
 */
export async function trackCommerceEvent(input: TrackCommerceEventInput): Promise<void> {
  if (!input.workspaceId) return;
  if (!analyticsAllowed()) return;

  const attribution = getAttribution() ?? captureAttribution();
  const first = getFirstTouch();
  const sessionId = currentSessionId();

  // Eventos de receita/estado: validados no servidor.
  if (!CLIENT_ALLOWED_EVENTS.includes(input.eventType)) {
    try {
      await supabase.functions.invoke("commerce-track", {
        body: {
          event_type: input.eventType,
          workspace_id: input.workspaceId,
          order_id: input.orderId ?? null,
          product_id: input.productId ?? null,
          variant_id: input.variantId ?? null,
          session_id: sessionId,
          attribution: attributionPayload(),
        },
      });
    } catch {
      /* tracking nunca bloqueia a UX */
    }
    return;
  }

  try {
    await supabase.from("ai_commerce_events").insert({
      workspace_id: input.workspaceId,
      event_type: input.eventType,
      source: attribution?.source ?? null,
      medium: attribution?.medium ?? null,
      campaign: attribution?.campaign ?? null,
      referrer: attribution?.referrer ?? null,
      landing_page: attribution?.landing_page ?? null,
      channel: attribution?.channel ?? "direct",
      is_ai_channel: attribution?.is_ai_channel ?? false,
      product_id: input.productId ?? null,
      variant_id: input.variantId ?? null,
      session_id: sessionId,
      country: input.country ?? null,
      first_touch_source: first?.source ?? null,
      first_touch_medium: first?.medium ?? null,
      first_touch_campaign: first?.campaign ?? null,
      first_touch_channel: first?.channel ?? null,
      last_touch_source: attribution?.source ?? null,
      last_touch_medium: attribution?.medium ?? null,
      last_touch_campaign: attribution?.campaign ?? null,
      last_touch_channel: attribution?.channel ?? null,
      // valor e encomenda ficam sempre a cargo do servidor
      value: null,
      order_id: null,
      currency: input.currency ?? "EUR",
    });
  } catch {
    /* tracking nunca bloqueia a UX */
  }
}
