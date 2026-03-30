import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const { workspace_id } = await req.json();
    if (!workspace_id)
      return new Response(JSON.stringify({ error: "workspace_id required" }), {
        status: 400,
        headers: corsHeaders,
      });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ── Collect signals in parallel ──
    const [
      wosRes,
      objectivesRes,
      actionsRes,
      ledgerRes,
      portfolioRes,
      decisionsRes,
    ] = await Promise.all([
      supabase
        .from("workspace_operating_state")
        .select("execution_health_score, context_health_score, overall_risk_level")
        .eq("workspace_id", workspace_id)
        .maybeSingle(),
      supabase
        .from("business_objectives")
        .select("id, status, progress")
        .eq("workspace_id", workspace_id)
        .in("status", ["active", "at_risk", "behind"]),
      supabase
        .from("kernel_actions")
        .select("id, status")
        .eq("workspace_id", workspace_id)
        .in("status", ["failed", "queued", "running"]),
      supabase
        .from("operating_ledger_chains")
        .select("id, status, outcome_value")
        .eq("workspace_id", workspace_id)
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("portfolio_recommendations")
        .select("id, status")
        .eq("workspace_id", workspace_id)
        .eq("status", "pending"),
      supabase
        .from("executive_decision_packs")
        .select("id, status")
        .eq("workspace_id", workspace_id)
        .eq("status", "pending"),
    ]);

    const wos = wosRes.data;
    const objectives = objectivesRes.data ?? [];
    const actions = actionsRes.data ?? [];
    const chains = ledgerRes.data ?? [];
    const pendingRecs = portfolioRes.data ?? [];
    const openDecisions = decisionsRes.data ?? [];

    // ── Calculate risk scores (0-100) ──
    const executionHealth = wos?.execution_health_score ?? 80;
    const contextHealth = wos?.context_health_score ?? 80;

    const executionRisk = Math.max(0, 100 - executionHealth);
    const contextRisk = Math.max(0, 100 - contextHealth);

    const failedActions = actions.filter((a) => a.status === "failed").length;
    const atRiskObjectives = objectives.filter(
      (o) => o.status === "at_risk" || o.status === "behind"
    ).length;
    const failedChains = chains.filter((c) => c.status === "failed").length;

    const revenueRisk = Math.min(
      100,
      failedChains * 10 + atRiskObjectives * 15
    );
    const forecastRisk = Math.min(100, pendingRecs.length * 5 + openDecisions.length * 10);

    // ── Overall status ──
    const maxRisk = Math.max(executionRisk, contextRisk, revenueRisk, forecastRisk);
    let overallStatus = "stable";
    if (maxRisk >= 70) overallStatus = "critical";
    else if (maxRisk >= 50) overallStatus = "risk";
    else if (maxRisk >= 30) overallStatus = "watch";

    // ── Focus priority ──
    let focusPriority = "Operações estáveis";
    if (failedActions > 3) focusPriority = "Ações falhadas requerem atenção";
    else if (atRiskObjectives > 0)
      focusPriority = `${atRiskObjectives} objetivo(s) em risco`;
    else if (failedChains > 0)
      focusPriority = `${failedChains} cadeia(s) causal falhada(s)`;

    // ── Generate interventions ──
    const interventions: any[] = [];

    if (failedActions > 0) {
      interventions.push({
        type: "intervene_now",
        title: `${failedActions} ações falhadas`,
        rationale: "Ações falhadas podem bloquear execução de missões e objetivos.",
        urgency: failedActions > 5 ? "critical" : "high",
        impact_estimate: "Desbloquear pipeline de execução",
        target_entity_type: "kernel_action",
        recommended_action: "retry_failed_actions",
      });
    }

    if (atRiskObjectives > 0) {
      interventions.push({
        type: "replan_objective",
        title: `${atRiskObjectives} objetivos em risco`,
        rationale: "Objetivos com progresso abaixo do esperado.",
        urgency: "high",
        impact_estimate: "Recuperar alinhamento estratégico",
        target_entity_type: "business_objective",
        recommended_action: "review_and_replan",
      });
    }

    if (failedChains > 2) {
      interventions.push({
        type: "monitor_closely",
        title: `${failedChains} cadeias causais falhadas`,
        rationale: "Padrão de falha pode indicar problema sistémico.",
        urgency: "medium",
        impact_estimate: "Prevenir falhas recorrentes",
        target_entity_type: "ledger_chain",
        recommended_action: "investigate_root_cause",
      });
    }

    if (contextRisk > 50) {
      interventions.push({
        type: "refresh_context",
        title: "Context OS desatualizado",
        rationale: "Dados de contexto com drift elevado.",
        urgency: contextRisk > 70 ? "critical" : "medium",
        impact_estimate: "Melhorar qualidade de decisões",
        target_entity_type: "context",
        recommended_action: "run_context_refresh",
      });
    }

    if (openDecisions.length > 3) {
      interventions.push({
        type: "escalate_human",
        title: `${openDecisions.length} decisões executivas pendentes`,
        rationale: "Decisões não tomadas atrasam execução.",
        urgency: "high",
        impact_estimate: "Desbloquear decisões estratégicas",
        target_entity_type: "executive_decision",
        recommended_action: "review_decisions",
      });
    }

    // ── Upsert state ──
    const statePayload = {
      workspace_id,
      overall_status: overallStatus,
      focus_priority: focusPriority,
      revenue_risk: revenueRisk,
      execution_risk: executionRisk,
      context_risk: contextRisk,
      forecast_risk: forecastRisk,
      open_critical_items: failedActions + atRiskObjectives,
      open_interventions: interventions.length,
      active_missions: objectives.filter((o) => o.status === "active").length,
      active_agents: actions.filter((a) => a.status === "running").length,
      overdue_tasks: failedActions,
      interventions_json: interventions,
      updated_at: new Date().toISOString(),
    };

    const { error: upsertErr } = await supabase
      .from("control_tower_state")
      .upsert(statePayload, { onConflict: "workspace_id" });

    if (upsertErr) throw upsertErr;

    // ── Emit tracking event ──
    await supabase.from("kernel_events").insert({
      workspace_id,
      type: "CONTROL_TOWER.STATE_UPDATED",
      entity_kind: "control_tower",
      entity_id: workspace_id,
      actor_type: "system",
      source_module: "control-tower",
      payload: { overall_status: overallStatus, interventions_count: interventions.length },
      occurred_at: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({ ok: true, overall_status: overallStatus, interventions: interventions.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
