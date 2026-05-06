import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { workspace_id, source_module, usage_type, quantity = 1, unit = "event",
      provider_name, provider_instance_id, user_id, entity_type, entity_id, country,
      metadata = {}, check_only = false } = body;

    if (!workspace_id || !source_module || !usage_type) {
      return new Response(JSON.stringify({ error: "workspace_id, source_module, usage_type required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: limitCheck } = await supabase.rpc("cost_guard_check_limit", {
      p_workspace_id: workspace_id, p_usage_type: usage_type, p_quantity: quantity,
    });

    const allowed = (limitCheck as any)?.allowed !== false;

    if (check_only) {
      return new Response(JSON.stringify({ check: limitCheck, recorded: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!allowed) {
      return new Response(JSON.stringify({ check: limitCheck, recorded: false, blocked: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: eventId, error } = await supabase.rpc("cost_guard_record_event", {
      p_workspace_id: workspace_id, p_source_module: source_module, p_usage_type: usage_type,
      p_quantity: quantity, p_unit: unit, p_provider_name: provider_name,
      p_provider_instance_id: provider_instance_id, p_user_id: user_id,
      p_entity_type: entity_type, p_entity_id: entity_id, p_country: country, p_metadata: metadata,
    });

    if (error) throw error;

    return new Response(JSON.stringify({ event_id: eventId, check: limitCheck, recorded: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[cost-guard-record]", e);
    return new Response(JSON.stringify({ error: "internal_error", fallback: true, recorded: false }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
