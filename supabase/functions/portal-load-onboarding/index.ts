// Carrega projeto onboarding via onboarding_token (sem auth)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    if (!token || token.length < 16) {
      return new Response(JSON.stringify({ error: "invalid_token" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: project } = await sb.from("customer_onboarding_projects")
      .select("id, title, status, priority, customer_company_name, customer_contact_name, customer_contact_email, kickoff_date, target_go_live_date, progress_pct, selected_modules")
      .eq("onboarding_token", token).maybeSingle();
    if (!project) {
      return new Response(JSON.stringify({ error: "not_found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: items } = await sb.from("customer_onboarding_checklist_items")
      .select("id, title, description, category, field_type, required, status, response_value, sort_order, rejection_reason")
      .eq("onboarding_project_id", project.id).eq("visible_to_customer", true)
      .order("sort_order");

    const { data: docs } = await sb.from("customer_onboarding_documents")
      .select("id, title, document_type, file_name, status, created_at")
      .eq("onboarding_project_id", project.id).eq("visible_to_customer", true);

    await sb.from("customer_portal_sessions").insert({
      onboarding_project_id: project.id, token, event_type: "onboarding_viewed",
      user_agent: req.headers.get("user-agent") ?? null,
    });

    return new Response(JSON.stringify({ project, items: items ?? [], documents: docs ?? [] }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("portal-load-onboarding error", e);
    return new Response(JSON.stringify({ error: "internal_error", fallback: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
