// Aceita proposta via portal público
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function hashIp(ip: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json();
    const { token, action, payload } = body;
    if (!token || !action) {
      return new Response(JSON.stringify({ error: "missing_fields" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: proposal } = await sb.from("proposals")
      .select("id, workspace_id, opportunity_id, contact_id, company_id, title")
      .eq("public_token", token).maybeSingle();
    if (!proposal) {
      return new Response(JSON.stringify({ error: "not_found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const ipHash = await hashIp(ip);
    const ua = req.headers.get("user-agent") ?? null;

    let acceptanceStatus = "started";
    let proposalNewStatus = "viewed";
    let opportunityStage: string | null = null;

    if (action === "accept") {
      acceptanceStatus = "accepted_pending_review";
      proposalNewStatus = "accepted_pending_internal_review";
      opportunityStage = "won";
    } else if (action === "request_changes") {
      acceptanceStatus = "changes_requested";
      proposalNewStatus = "changes_requested";
      opportunityStage = "negotiation";
    } else if (action === "reject") {
      acceptanceStatus = "rejected";
      proposalNewStatus = "rejected";
      opportunityStage = "lost";
    } else {
      return new Response(JSON.stringify({ error: "invalid_action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: acceptance, error: aErr } = await sb.from("sales_proposal_acceptances").insert({
      workspace_id: proposal.workspace_id,
      proposal_id: proposal.id,
      opportunity_id: proposal.opportunity_id,
      contact_id: proposal.contact_id,
      company_id: proposal.company_id,
      status: acceptanceStatus,
      accepted_by_name: payload?.name ?? null,
      accepted_by_email: payload?.email ?? null,
      accepted_by_phone: payload?.phone ?? null,
      accepted_by_role: payload?.role ?? null,
      company_name: payload?.company_name ?? null,
      company_tax_id: payload?.tax_id ?? null,
      company_address: payload?.address ?? null,
      accepted_terms: !!payload?.accepted_terms,
      accepted_privacy: !!payload?.accepted_privacy,
      acceptance_notes: payload?.notes ?? null,
      requested_changes: payload?.requested_changes ?? null,
      change_type: payload?.change_type ?? null,
      rejection_reason: payload?.rejection_reason ?? null,
      rejection_category: payload?.rejection_category ?? null,
      ip_hash: ipHash,
      user_agent: ua,
      submitted_at: new Date().toISOString(),
    }).select().single();
    if (aErr) throw aErr;

    await sb.from("proposals").update({
      status: proposalNewStatus,
      accepted_at: action === "accept" ? new Date().toISOString() : null,
      acceptance_count: 1,
    }).eq("id", proposal.id);

    if (proposal.opportunity_id && opportunityStage) {
      await sb.from("opportunities").update({ stage: opportunityStage }).eq("id", proposal.opportunity_id);
    }

    let onboardingProjectId: string | null = null;
    if (action === "accept") {
      const { data: project } = await sb.from("customer_onboarding_projects").insert({
        workspace_id: proposal.workspace_id,
        proposal_id: proposal.id,
        acceptance_id: acceptance.id,
        opportunity_id: proposal.opportunity_id,
        contact_id: proposal.contact_id,
        company_id: proposal.company_id,
        title: `Onboarding ${payload?.company_name ?? proposal.title}`,
        status: "waiting_customer",
        priority: "high",
        customer_company_name: payload?.company_name ?? null,
        customer_contact_name: payload?.name ?? null,
        customer_contact_email: payload?.email ?? null,
        customer_contact_phone: payload?.phone ?? null,
        metadata: { source: "portal_acceptance", proposal_title: proposal.title },
      }).select().single();
      onboardingProjectId = project?.id ?? null;

      if (project) {
        // Tarefas internas iniciais
        await sb.from("onboarding_internal_tasks").insert([
          { workspace_id: proposal.workspace_id, onboarding_project_id: project.id, title: "Validar aceitação", priority: "high" },
          { workspace_id: proposal.workspace_id, onboarding_project_id: project.id, title: "Rever dados da empresa", priority: "high" },
          { workspace_id: proposal.workspace_id, onboarding_project_id: project.id, title: "Preparar workspace e plano", priority: "medium" },
          { workspace_id: proposal.workspace_id, onboarding_project_id: project.id, title: "Agendar kickoff", priority: "high" },
        ]);
        await sb.from("customer_onboarding_events").insert({
          workspace_id: proposal.workspace_id,
          onboarding_project_id: project.id,
          event_type: "project_created",
          description: "Projeto criado a partir de aceitação no portal público",
        });
      }
    }

    await sb.from("customer_portal_sessions").insert({
      proposal_id: proposal.id,
      onboarding_project_id: onboardingProjectId,
      token,
      event_type: action === "accept" ? "accept_submitted" : action === "reject" ? "rejected" : "changes_requested",
      contact_email: payload?.email ?? null,
      ip_hash: ipHash,
      user_agent: ua,
    });

    return new Response(JSON.stringify({
      success: true,
      acceptance_id: acceptance.id,
      onboarding_project_id: onboardingProjectId,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("portal-accept-proposal error", e);
    return new Response(JSON.stringify({ error: "internal_error", fallback: true, message: String(e) }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
