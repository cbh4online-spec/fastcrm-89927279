/**
 * Shared Security Helpers for Edge Functions
 * 
 * Provides JWT validation, webhook signature verification,
 * payload validation, and structured security logging.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// ─── JWT Authentication ─────────────────────────────────────────────────────

export interface AuthResult {
  userId: string;
  email?: string;
  role?: string;
}

/**
 * Validates JWT from Authorization header using getClaims().
 * Returns user info or throws a Response with 401.
 */
export async function requireAuth(req: Request): Promise<AuthResult> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Response(JSON.stringify({ error: "Missing or invalid Authorization header" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await supabase.auth.getClaims(token);

  if (error || !data?.claims) {
    throw new Response(JSON.stringify({ error: "Invalid or expired token" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  return {
    userId: data.claims.sub as string,
    email: data.claims.email as string | undefined,
    role: data.claims.role as string | undefined,
  };
}

/**
 * Validates that the authenticated user belongs to the given workspace.
 */
export async function requireWorkspaceMembership(
  userId: string,
  workspaceId: string,
): Promise<void> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data, error } = await supabase
    .from("workspace_members")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    throw new Response(JSON.stringify({ error: "Not a member of this workspace" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
}

// ─── Webhook Signature Verification ──────────────────────────────────────────

/**
 * Verifies HMAC-SHA256 webhook signature.
 * @param body - Raw request body string
 * @param signature - Signature from header
 * @param secret - Shared secret
 * @param prefix - Optional prefix (e.g., "sha256=")
 */
export async function verifyWebhookSignature(
  body: string,
  signature: string,
  secret: string,
  prefix = "",
): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const expectedHex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const expected = `${prefix}${expectedHex}`;
  
  // Constant-time comparison
  if (expected.length !== signature.length) return false;
  let result = 0;
  for (let i = 0; i < expected.length; i++) {
    result |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return result === 0;
}

// ─── Anti-Replay Protection ─────────────────────────────────────────────────

const recentRequests = new Map<string, number>();
const REPLAY_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Basic anti-replay check using request fingerprint.
 * Uses in-memory store (per-instance, not distributed).
 */
export function checkReplay(fingerprint: string): boolean {
  const now = Date.now();

  // Clean expired entries
  for (const [key, ts] of recentRequests) {
    if (now - ts > REPLAY_WINDOW_MS) {
      recentRequests.delete(key);
    }
  }

  if (recentRequests.has(fingerprint)) {
    return true; // replay detected
  }

  recentRequests.set(fingerprint, now);
  return false;
}

// ─── Rate Limiting ──────────────────────────────────────────────────────────

const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

/**
 * Basic in-memory rate limiter (per edge function instance).
 * Returns true if rate limit exceeded.
 */
export function isRateLimited(
  key: string,
  maxRequests: number = 60,
  windowMs: number = 60_000,
): boolean {
  const now = Date.now();
  const bucket = rateLimitBuckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  bucket.count++;
  return bucket.count > maxRequests;
}

// ─── Payload Validation ─────────────────────────────────────────────────────

/**
 * Validates request payload against a Zod-like schema.
 * Returns parsed data or throws a 400 Response.
 */
export function validatePayload<T>(
  schema: { safeParse: (data: unknown) => { success: boolean; data?: T; error?: { flatten: () => { fieldErrors: Record<string, string[]> } } } },
  data: unknown,
): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new Response(
      JSON.stringify({ error: "Invalid payload", details: result.error?.flatten().fieldErrors }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }
  return result.data!;
}

// ─── Security Logging ───────────────────────────────────────────────────────

export type SecurityEventType =
  | "auth_success"
  | "auth_failure"
  | "webhook_verified"
  | "webhook_invalid"
  | "rate_limited"
  | "replay_detected"
  | "payload_invalid"
  | "access_denied";

export interface SecurityLogEntry {
  event: SecurityEventType;
  functionName: string;
  ip?: string;
  userId?: string;
  workspaceId?: string;
  details?: Record<string, unknown>;
}

/**
 * Logs structured security event to stdout (captured by Supabase logging).
 */
export function securityLog(entry: SecurityLogEntry): void {
  console.log(
    JSON.stringify({
      _type: "security_event",
      timestamp: new Date().toISOString(),
      ...entry,
    }),
  );
}

/**
 * Extracts client IP from request headers (common proxy patterns).
 */
export function getClientIP(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

// ─── Service Role Guard ─────────────────────────────────────────────────────

/**
 * Validates that the request is authorized with the service_role key.
 * Use for internal/cron functions that should only be called by pg_cron or service_role.
 */
export function requireServiceRole(req: Request): void {
  const authHeader = req.headers.get("Authorization");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!authHeader || !serviceRoleKey || authHeader !== `Bearer ${serviceRoleKey}`) {
    throw new Response(JSON.stringify({ error: "Unauthorized — service_role required" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
}

// ─── Distributed Rate Limiting ──────────────────────────────────────────────

/**
 * Database-backed rate limiter for production use across multiple instances.
 * Falls back to in-memory rate limiting if DB call fails.
 * Requires table `edge_function_rate_limits` with columns:
 *   rate_key TEXT PRIMARY KEY, request_count INT, window_start TIMESTAMPTZ
 */
export async function isRateLimitedDistributed(
  key: string,
  maxRequests: number = 60,
  windowMs: number = 60_000,
): Promise<boolean> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.49.1");
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const now = new Date();
    const windowStart = new Date(now.getTime() - windowMs);

    // Upsert: increment if within window, reset if expired
    const { data, error } = await supabase.rpc("check_rate_limit", {
      p_key: key,
      p_max_requests: maxRequests,
      p_window_ms: windowMs,
    });

    if (error) {
      console.warn("[security] Distributed rate limit DB error, falling back to in-memory:", error.message);
      return isRateLimited(key, maxRequests, windowMs);
    }

    return data === true;
  } catch (e) {
    console.warn("[security] Distributed rate limit error, falling back to in-memory:", e);
    return isRateLimited(key, maxRequests, windowMs);
  }
}
