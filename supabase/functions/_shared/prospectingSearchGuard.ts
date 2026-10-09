import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

export const prospectingCorsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

export function searchJson(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...prospectingCorsHeaders, "Content-Type": "application/json" },
  });
}

export function searchErrorStatus(code?: string): number {
  switch (code) {
    case "unauthorized": return 401;
    case "forbidden":
    case "subscription_required":
    case "module_required": return 403;
    case "quota_exceeded":
    case "insufficient_credits": return 429;
    case "reserved":
    case "idempotency_conflict": return 409;
    case "invalid_request": return 400;
    default: return 503;
  }
}

export type SearchContext = {
  userId: string;
  workspaceId: string;
  userClient: SupabaseClient;
  adminClient: SupabaseClient;
};

export async function getSearchContext(
  req: Request,
  workspaceId: unknown,
): Promise<{ context?: SearchContext; error?: Response }> {
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) {
    return { error: searchJson({ success: false, code: "unauthorized", error: "Autenticação necessária" }, 401) };
  }
  if (typeof workspaceId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(workspaceId)) {
    return { error: searchJson({ success: false, code: "invalid_request", error: "Espaço de trabalho inválido" }, 400) };
  }
  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anonKey || !serviceKey) {
    console.error("Prospecting search Supabase configuration missing");
    return { error: searchJson({ success: false, code: "configuration_error", error: "Serviço indisponível" }, 503) };
  }
  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await userClient.auth.getUser(token);
  if (error || !data.user) {
    return { error: searchJson({ success: false, code: "unauthorized", error: "Sessão inválida" }, 401) };
  }
  const adminClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return { context: { userId: data.user.id, workspaceId, userClient, adminClient } };
}

export type SearchReservation = {
  success: boolean;
  code?: string;
  error?: string;
  status?: "reserved" | "completed";
  operation_id?: string;
  response?: unknown;
  usage?: number;
  limit?: number;
  credits_reserved?: number;
};

export async function beginSearch(
  context: SearchContext,
  actionKey: "prospecting_google_local_search" | "prospecting_web_search" | "prospecting_professional_search",
  requestId?: unknown,
): Promise<{ reservation?: SearchReservation; error?: Response }> {
  const id = requestId === undefined || requestId === null
    ? crypto.randomUUID()
    : requestId;
  if (typeof id !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return { error: searchJson({ success: false, code: "invalid_request", error: "Identificador de pedido inválido" }, 400) };
  }
  const { data, error } = await context.userClient.rpc("begin_prospecting_search", {
    p_workspace_id: context.workspaceId,
    p_action_key: actionKey,
    p_request_id: id,
  });
  if (error) {
    console.error("begin_prospecting_search failed", error);
    return { error: searchJson({ success: false, code: "credit_service_error", error: "Não foi possível validar os créditos" }, 503) };
  }
  const reservation = data as SearchReservation;
  if (!reservation?.success) {
    return { error: searchJson(reservation ?? { success: false, error: "Pesquisa indisponível" }, searchErrorStatus(reservation?.code)) };
  }
  return { reservation };
}

export async function settleSearch(
  context: SearchContext,
  operationId: string,
  success: boolean,
  response: unknown = null,
): Promise<boolean> {
  const { data, error } = await context.adminClient.rpc("settle_prospecting_search", {
    p_operation_id: operationId,
    p_success: success,
    p_response: response,
  });
  if (error) {
    console.error("settle_prospecting_search failed", { operationId, error });
    return false;
  }
  return (data as { success?: boolean })?.success === success;
}
