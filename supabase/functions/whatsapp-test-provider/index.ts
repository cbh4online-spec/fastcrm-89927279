// FastCRM WhatsApp Pro — Test provider connection
// Devolve estado da instância + diagnostic info, sem expor tokens.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(supabaseUrl, serviceKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: claims } = await userClient.auth.getClaims(token);
    if (!claims?.claims) return json({ error: "Unauthorized" }, 401);
    const userId = claims.claims.sub;

    const { workspaceId } = (await req.json()) as { workspaceId: string };
    if (!workspaceId) return json({ error: "workspaceId required" }, 400);

    const { data: member } = await admin
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!member) return json({ error: "permission_denied" }, 403);

    const { data: instance } = await admin
      .from("whatsapp_provider_instances")
      .select("id, provider_name, display_name, active, environment, webhook_last_received_at, webhook_last_error, default_country_code")
      .eq("workspace_id", workspaceId)
      .eq("active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!instance) {
      return json({ ok: false, error: "provider_not_configured" }, 200);
    }

    // Para Z-API, ler estado da connection
    let connectionStatus: string | null = null;
    if (instance.provider_name === "zapi" || instance.provider_name === "zapy") {
      const { data: zapi } = await admin
        .from("whatsapp_zapi_connections")
        .select("status, phone_number, connected_at")
        .eq("workspace_id", workspaceId)
        .maybeSingle();
      connectionStatus = (zapi?.status as string | null) ?? null;
    }

    return json({
      ok: true,
      provider: instance.provider_name,
      display_name: instance.display_name,
      environment: instance.environment,
      connection_status: connectionStatus,
      webhook_last_received_at: instance.webhook_last_received_at,
      webhook_last_error: instance.webhook_last_error,
      default_country_code: instance.default_country_code,
    }, 200);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "internal_error", fallback: true }, 200);
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
