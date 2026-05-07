import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) throw new Error("missing_auth");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const { data: userData } = await supabase.auth.getUser(auth.replace("Bearer ", ""));
    const user = userData?.user;
    if (!user) throw new Error("unauthorized");

    const body = await req.json();
    const {
      workspace_id,
      request_type = "plan_upgrade",
      requested_plan_slug,
      requested_addon_slug,
      reason,
      usage_context,
    } = body ?? {};

    if (!workspace_id) throw new Error("workspace_id_required");

    let requested_plan_id: string | null = null;
    if (requested_plan_slug) {
      const { data } = await supabase
        .from("billing_plans")
        .select("id")
        .or(`slug.eq.${requested_plan_slug},code.eq.${requested_plan_slug}`)
        .limit(1)
        .maybeSingle();
      requested_plan_id = data?.id ?? null;
    }

    let requested_addon_id: string | null = null;
    if (requested_addon_slug) {
      const { data } = await supabase
        .from("billing_addons")
        .select("id")
        .or(`slug.eq.${requested_addon_slug},code.eq.${requested_addon_slug}`)
        .limit(1)
        .maybeSingle();
      requested_addon_id = data?.id ?? null;
    }

    const { data: sub } = await supabase
      .from("workspace_subscriptions")
      .select("billing_plan_id")
      .eq("workspace_id", workspace_id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: created, error } = await supabase
      .from("workspace_upgrade_requests")
      .insert({
        workspace_id,
        requested_by: user.id,
        current_plan_id: sub?.billing_plan_id ?? null,
        requested_plan_id,
        requested_addon_id,
        request_type,
        reason: reason ?? null,
        usage_context: usage_context ?? {},
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({ ok: true, request: created }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, fallback: true, error: (e as Error).message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  }
});
