import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── CORS ──
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

export function jsonRes(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ── API helper with timeout + safe JSON ──
const DEFAULT_TIMEOUT_MS = 8000;

export async function evoFetch(
  baseUrl: string,
  path: string,
  apiKey: string,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<{ ok: boolean; status: number; data: any; text: string }> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, ...fetchInit } = init;
  const url = `${baseUrl}${path}`;
  try {
    const res = await fetch(url, {
      ...fetchInit,
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        apikey: apiKey,
        ...(fetchInit.headers || {}),
      },
    });
    const text = await res.text();
    let data: any = null;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
    return { ok: res.ok, status: res.status, data, text: text.substring(0, 500) };
  } catch (err: any) {
    const isTimeout = err.name === "TimeoutError" || err.name === "AbortError";
    console.error(`[EVO_FETCH] ${isTimeout ? "TIMEOUT" : "NETWORK_ERROR"} path=${path}`, err.message);
    return {
      ok: false,
      status: isTimeout ? 504 : 0,
      data: { error: err.message, timeout: isTimeout },
      text: err.message,
    };
  }
}

// ── Error normalization ──
export function normalizeEvolutionError(data: any): string | null {
  if (!data) return null;
  // Stream error
  if (data?.tag === "stream:error" || data?.fullErrorNode?.tag === "stream:error") {
    return `Stream error (code ${data?.attrs?.code || data?.fullErrorNode?.attrs?.code || "unknown"})`;
  }
  // Disconnection object
  const disc = data?.disconnectionObject || data?.instance?.disconnectionObject;
  if (disc) return disc?.message || disc?.reason || JSON.stringify(disc);
  // Simple error string
  if (typeof data?.error === "string") return data.error;
  if (data?.message && typeof data.message === "string") return data.message;
  return null;
}

// ── State mapping ──
export function mapEvolutionState(state: string | undefined): string {
  switch (state?.toUpperCase()) {
    case "OPEN": return "connected";
    case "CLOSE": return "disconnected";
    case "CONNECTING": return "waiting_for_scan";
    case "LOGOUT": return "disconnected";
    case "NOT_CONNECTION": return "disconnected";
    case "PAIRING": return "authenticating";
    default: return "error";
  }
}

export function isLogoutState(state: string | undefined, connectionStatus: string | undefined): boolean {
  const s = state?.toUpperCase();
  const cs = connectionStatus?.toUpperCase();
  return s === "LOGOUT" || cs === "NOT_CONNECTION" || cs === "LOGOUT";
}

// ── URL sanitization ──
export function getBaseUrl(rawUrl: string): string {
  let url = rawUrl.trim();
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    if (url.includes("://")) throw new Error("EVOLUTION_API_URL must be an HTTP(S) URL.");
    url = `https://${url}`;
  }
  return new URL(url).origin;
}

// ── Auth validation ──
export async function validateAuth(
  req: Request,
): Promise<{ userId: string; error?: never } | { userId?: never; error: Response }> {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return { error: jsonRes({ error: "Missing authorization" }, 401) };

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: { user }, error } = await userClient.auth.getUser(authHeader.replace("Bearer ", ""));
  if (error || !user) return { error: jsonRes({ error: "Invalid token" }, 401) };

  return { userId: user.id };
}

export async function validateWorkspaceMembership(
  userId: string,
  workspaceId: string,
): Promise<{ ok: boolean; error?: Response }> {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Check super admin first
  const { data: profile } = await admin
    .from("profiles")
    .select("is_super_admin")
    .eq("id", userId)
    .maybeSingle();
  if (profile?.is_super_admin) return { ok: true };

  const { data: member } = await admin
    .from("workspace_members")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!member) return { ok: false, error: jsonRes({ error: "Not a member of this workspace" }, 403) };
  return { ok: true };
}

// ── Admin client factory ──
export function getAdminClient() {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return { admin: createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY), supabaseUrl: SUPABASE_URL };
}

// ── Evolution API config ──
export function getEvolutionConfig(): { baseUrl: string; apiKey: string } | { error: Response } {
  const rawUrl = Deno.env.get("EVOLUTION_API_URL");
  const apiKey = Deno.env.get("EVOLUTION_API_KEY");
  if (!rawUrl || !apiKey) return { error: jsonRes({ error: "Evolution API not configured" }, 500) };
  try {
    return { baseUrl: getBaseUrl(rawUrl), apiKey };
  } catch {
    return { error: jsonRes({ error: "EVOLUTION_API_URL must be an HTTP(S) URL." }, 500) };
  }
}

// ── Sync health inference ──
export function inferSyncHealth(
  connectionStatus: string,
  lastInboundAt: string | null,
  lastOutboundAt: string | null,
  connectedAt: string | null = null,
  lastSeenAt: string | null = null,
): { sync_health: string; sync_issue_reason: string | null } {
  if (connectionStatus !== "connected") {
    return { sync_health: "failed", sync_issue_reason: "Sessão WhatsApp não está conectada" };
  }
  const now = Date.now();
  const twentyFourH = 24 * 60 * 60 * 1000;

  if (lastInboundAt) {
    const inboundAge = now - new Date(lastInboundAt).getTime();
    if (inboundAge < 30 * 60_000) return { sync_health: "active", sync_issue_reason: null };
    if (inboundAge < 2 * 3600_000) return { sync_health: "delayed", sync_issue_reason: `Sem mensagens inbound há ${Math.round(inboundAge / 60000)} minutos` };
  }

  const freshestActivity = [connectedAt, lastSeenAt, lastOutboundAt]
    .filter(Boolean)
    .map((d) => new Date(d!).getTime())
    .reduce((a, b) => Math.max(a, b), 0);

  if (freshestActivity > 0) {
    const activityAge = now - freshestActivity;
    if (activityAge < twentyFourH) return { sync_health: "active", sync_issue_reason: null };
    return { sync_health: "suspended", sync_issue_reason: `Sem qualquer actividade há mais de ${Math.round(activityAge / 3600000)} horas` };
  }

  return { sync_health: "unknown", sync_issue_reason: "Sem dados de actividade para inferir saúde de sincronização" };
}

export function reconcileRecoveryState(
  syncHealth: string,
  currentRecoveryState: string,
  attemptCount: number,
): { recovery_state: string; recovery_attempt_count: number } {
  if (syncHealth === "active") return { recovery_state: "none", recovery_attempt_count: 0 };
  if (currentRecoveryState === "repair_required") return { recovery_state: "repair_required", recovery_attempt_count: attemptCount };
  if (attemptCount >= 3 && (syncHealth === "suspended" || syncHealth === "failed" || syncHealth === "degraded")) {
    return { recovery_state: "repair_required", recovery_attempt_count: attemptCount };
  }
  return { recovery_state: currentRecoveryState || "none", recovery_attempt_count: attemptCount };
}

// ── Webhook URL helper ──
export function getWebhookUrl(): string {
  return `${Deno.env.get("SUPABASE_URL")!}/functions/v1/whatsapp-evolution-webhook`;
}

// ── Instance name helper ──
export function instanceNameFor(workspaceId: string): string {
  return `ws_${workspaceId.replace(/-/g, "").substring(0, 16)}`;
}
