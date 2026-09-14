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

/** Captura a atribuição na primeira visita da sessão e devolve-a. */
export function captureAttribution(): CommerceAttribution | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const utmSource = params.get("utm_source");
  const utmMedium = params.get("utm_medium");
  const utmCampaign = params.get("utm_campaign");
  const referrer = document.referrer || null;

  const existing = getAttribution();
  const hasNewSignal = !!(utmSource || utmMedium || utmCampaign);
  if (existing && !hasNewSignal) return existing;

  const { channel, isAi } = resolveChannel({ source: utmSource, medium: utmMedium, referrer });
  const attribution: CommerceAttribution = {
    source: utmSource,
    medium: utmMedium,
    campaign: utmCampaign,
    referrer,
    landing_page: window.location.pathname,
    channel,
    is_ai_channel: isAi,
    captured_at: new Date().toISOString(),
  };
  try {
    sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(attribution));
  } catch {
    /* noop */
  }
  return attribution;
}

export function getAttribution(): CommerceAttribution | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(ATTRIBUTION_KEY);
    return raw ? (JSON.parse(raw) as CommerceAttribution) : null;
  } catch {
    return null;
  }
}

export type CommerceEventType =
  | "visit"
  | "product_view"
  | "lead"
  | "add_to_cart"
  | "checkout_start"
  | "purchase";

export interface TrackCommerceEventInput {
  workspaceId: string;
  eventType: CommerceEventType;
  productId?: string | null;
  orderId?: string | null;
  customerId?: string | null;
  value?: number | null;
  currency?: string | null;
  country?: string | null;
}

/** Registo do evento no funil, com a atribuição da sessão. Falha em silêncio. */
export async function trackCommerceEvent(input: TrackCommerceEventInput): Promise<void> {
  if (!input.workspaceId) return;
  if (!analyticsAllowed()) return;
  const attribution = getAttribution() ?? captureAttribution();
  let sessionId: string | null = null;
  try {
    sessionId = localStorage.getItem(SESSION_KEY);
  } catch {
    /* noop */
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
      order_id: input.orderId ?? null,
      customer_id: input.customerId ?? null,
      session_id: sessionId,
      country: input.country ?? null,
      value: typeof input.value === "number" ? input.value : null,
      currency: input.currency ?? "EUR",
    });
  } catch {
    /* tracking nunca bloqueia a UX */
  }
}
