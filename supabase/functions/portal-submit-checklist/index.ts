// Submete resposta de item de checklist via portal público
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { token, item_id, response_value, response_json } = await req.json();
    if (!token || !item_id) {
      return new Response(JSON.stringify({ error: "missing_fields" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: project } = await sb.from("customer_onboarding_projects")
      .select("id, workspace_id").eq("onboarding_token", token).maybeSingle();
    if (!project) {
      return new Response(JSON.stringify({ error: "not_found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const sanitized = typeof response_value === "string" ? response_value.slice(0, 5000) : null;

    await sb.from("customer_onboarding_checklist_items").update({
      response_value: sanitized,
      response_json: response_json ?? {},
      status: "submitted",
    }).eq("id", item_id).eq("onboarding_project_id", project.id);

    await sb.from("customer_onboarding_events").insert({
      workspace_id: project.workspace_id,
      onboarding_project_id: project.id,
      event_type: "checklist_item_submitted",
      payload: { item_id },
    });

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("portal-submit-checklist error", e);
    return new Response(JSON.stringify({ error: "internal_error", fallback: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
