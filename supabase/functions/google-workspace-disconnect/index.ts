// Revoke + delete a workspace Google connection.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-info, x-supabase-client-name",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { workspace_id, service } = await req.json();
    if (!workspace_id || !service) {
      return new Response(JSON.stringify({ error: "Parâmetros inválidos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userRes } = await userClient.auth.getUser();
    const user = userRes?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: membership } = await admin
      .from("workspace_members")
      .select("workspace_id")
      .eq("workspace_id", workspace_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!membership) {
      return new Response(JSON.stringify({ error: "Sem acesso" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: conn } = await admin
      .from("workspace_google_connections")
      .select("refresh_token, access_token")
      .eq("workspace_id", workspace_id)
      .eq("service", service)
      .maybeSingle();

    // Best-effort token revoke
    if (conn?.refresh_token || conn?.access_token) {
      try {
        await fetch(
          `https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(
            conn.refresh_token ?? conn.access_token ?? "",
          )}`,
          { method: "POST" },
        );
      } catch (e) {
        console.warn("[google-disconnect] revoke failed", e);
      }
    }

    const { error: delErr } = await admin
      .from("workspace_google_connections")
      .delete()
      .eq("workspace_id", workspace_id)
      .eq("service", service);

    if (delErr) throw delErr;

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[google-workspace-disconnect]", e);
    return new Response(JSON.stringify({ error: (e as Error).message, fallback: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
