import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const OBJECTION_LABELS: Record<string, string> = {
  price: "Preço",
  timing: "Timing",
  authority: "Autoridade",
  competitor: "Concorrência",
  uncertainty: "Incerteza",
  no_need: "Sem Necessidade",
  confusion: "Confusão",
};

async function computeDecisionsForWorkspace(
  supabase: ReturnType<typeof createClient>,
  workspace_id: string
) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

  // Fetch all needed data in parallel
  const [forecastsResult, scoresResult, signalsResult, oppsResult, existingResult] =
    await Promise.all([
      supabase
        .from("revenue_forecasts")
        .select("*")
        .eq("workspace_id", workspace_id)
        .order("generated_at", { ascending: false })
        .limit(2),

      supabase
        .from("deal_scores")
        .select("opportunity_id, close_score, category, urgency, next_action, updated_at")
        .eq("workspace_id", workspace_id),

      supabase
        .from("conversation_signals")
        .select("main_objection, churn_risk, temperature")
        .eq("workspace_id", workspace_id),

      supabase
        .from("opportunities")
        .select("id, value, title")
        .eq("workspace_id", workspace_id)
        .eq("status", "open"),

      supabase
        .from("strategic_decisions")
        .select("rule_key")
        .eq("workspace_id", workspace_id)
        .eq("status", "open")
        .gte("created_at", sevenDaysAgo),
    ]);

  if (forecastsResult.error) throw forecastsResult.error;
  if (scoresResult.error) throw scoresResult.error;
  if (signalsResult.error) throw signalsResult.error;
  if (oppsResult.error) throw oppsResult.error;

  const forecasts = forecastsResult.data || [];
  const scores = scoresResult.data || [];
  const signals = signalsResult.data || [];
  const opportunities = oppsResult.data || [];
  const existingRuleKeys = new Set(
    (existingResult.data || []).map((d: any) => d.rule_key).filter(Boolean)
  );

  const decisions: any[] = [];

  // ── Rule 1: Revenue Forecast Drop > 20% ──────────────────────────────────
  if (
    !existingRuleKeys.has("revenue_drop") &&
    forecasts.length >= 2
  ) {
    const latest = forecasts[0];
    const previous = forecasts[1];
    if (
      previous.expected_case > 0 &&
      latest.expected_case < previous.expected_case * 0.8
    ) {
      const dropPct = Math.round(
        ((previous.expected_case - latest.expected_case) / previous.expected_case) * 100
      );
      decisions.push({
        workspace_id,
        decision_title: "Queda de receita prevista — acção de aquisição necessária",
        business_area: "sales",
        impact_level: "high",
        urgency: "immediate",
        explanation: `A receita esperada caiu ${dropPct}% em relação ao período anterior (de €${Math.round(previous.expected_case).toLocaleString("pt")} para €${Math.round(latest.expected_case).toLocaleString("pt")}). Uma queda desta magnitude exige acção imediata para travar a tendência.`,
        recommended_steps: JSON.stringify([
          "Rever oportunidades estagnadas e activar follow-up urgente",
          "Lançar campanha de reactivação para leads frios",
          "Analisar deals perdidos recentes para identificar padrões",
        ]),
        rule_key: "revenue_drop",
      });
    }
  }

  // ── Rule 2: Hot Deals Inactive > 3 days ──────────────────────────────────
  if (!existingRuleKeys.has("hot_inactive")) {
    const hotInactive = scores.filter(
      (s: any) =>
        s.category === "hot" &&
        s.updated_at &&
        new Date(s.updated_at) < new Date(threeDaysAgo)
    );
    if (hotInactive.length > 0) {
      decisions.push({
        workspace_id,
        decision_title: `${hotInactive.length} negócio${hotInactive.length > 1 ? "s" : ""} quente${hotInactive.length > 1 ? "s" : ""} sem actividade há mais de 3 dias`,
        business_area: "sales",
        impact_level: "high",
        urgency: "immediate",
        explanation: `${hotInactive.length} negócio${hotInactive.length > 1 ? "s" : ""} com probabilidade elevada (categoria "quente") não registou actividade nos últimos 3 dias. O risco de perda aumenta significativamente após 5 dias sem contacto.`,
        recommended_steps: JSON.stringify([
          "Contactar cada negócio quente com uma mensagem personalizada hoje",
          "Agendar reuniões pendentes para esta semana",
          "Verificar se existem bloqueios ou objeções não registadas",
        ]),
        rule_key: "hot_inactive",
      });
    }
  }

  // ── Rule 3: Same objection in > 25% of conversations ─────────────────────
  if (!existingRuleKeys.has("objection_dominance") && signals.length >= 4) {
    const objCounts: Record<string, number> = {};
    signals.forEach((s: any) => {
      if (s.main_objection && s.main_objection !== "none") {
        objCounts[s.main_objection] = (objCounts[s.main_objection] || 0) + 1;
      }
    });
    const topObjEntry = Object.entries(objCounts).sort((a, b) => b[1] - a[1])[0];
    if (topObjEntry) {
      const [topObjKey, topObjCount] = topObjEntry;
      const ratio = topObjCount / signals.length;
      if (ratio > 0.25) {
        const label = OBJECTION_LABELS[topObjKey] ?? topObjKey;
        const pct = Math.round(ratio * 100);
        const area = topObjKey === "price" ? "pricing" : "marketing";
        decisions.push({
          workspace_id,
          decision_title: `Objeção dominante: "${label}" em ${pct}% das conversas`,
          business_area: area,
          impact_level: "medium",
          urgency: "this_week",
          explanation: `A objeção de ${label.toLowerCase()} aparece em ${pct}% das conversas analisadas (${topObjCount} de ${signals.length}). Uma frequência acima de 25% indica um problema sistémico no posicionamento ou comunicação.`,
          recommended_steps: JSON.stringify([
            `Criar template de resposta específico para a objeção de ${label.toLowerCase()}`,
            "Rever posicionamento de preço/oferta com base no feedback dos contactos",
            "Analisar argumentação dos concorrentes e actualizar materiais de vendas",
          ]),
          rule_key: "objection_dominance",
        });
      }
    }
  }

  // ── Rule 4: Churn Risk Rising ─────────────────────────────────────────────
  if (!existingRuleKeys.has("churn_rising")) {
    const highRiskSignals = signals.filter(
      (s: any) => s.churn_risk != null && s.churn_risk > 0.5
    );
    const criticalRisk = signals.filter(
      (s: any) => s.churn_risk != null && s.churn_risk > 0.7
    );
    if (highRiskSignals.length > 0 && criticalRisk.length >= 2) {
      const avgRisk =
        highRiskSignals.reduce((acc: number, s: any) => acc + (s.churn_risk ?? 0), 0) /
        highRiskSignals.length;
      if (avgRisk > 0.6) {
        decisions.push({
          workspace_id,
          decision_title: `Risco de churn elevado em ${criticalRisk.length} contactos`,
          business_area: "retention",
          impact_level: "high",
          urgency: "immediate",
          explanation: `${criticalRisk.length} contactos apresentam risco de churn acima de 70% e ${highRiskSignals.length} acima de 50%. O risco médio do segmento de alto risco é ${Math.round(avgRisk * 100)}%. Acção imediata pode prevenir perdas de receita recorrente.`,
          recommended_steps: JSON.stringify([
            "Contactar clientes de alto risco com uma oferta de valor personalizada esta semana",
            "Escalar casos críticos (churn > 80%) para gestor de conta ou equipa de retenção",
            "Implementar check-in proactivo semanal para o segmento de alto risco",
          ]),
          rule_key: "churn_rising",
        });
      }
    }
  }

  // ── Rule 5: Pipeline Concentration > 40% in one deal ─────────────────────
  if (!existingRuleKeys.has("concentration") && opportunities.length > 0) {
    const totalValue = opportunities.reduce(
      (acc: number, o: any) => acc + (Number(o.value) || 0),
      0
    );
    if (totalValue > 0) {
      const sorted = [...opportunities].sort(
        (a: any, b: any) => (Number(b.value) || 0) - (Number(a.value) || 0)
      );
      const topOpp = sorted[0];
      const topValue = Number(topOpp.value) || 0;
      const concentration = topValue / totalValue;
      if (concentration > 0.4) {
        const pct = Math.round(concentration * 100);
        decisions.push({
          workspace_id,
          decision_title: `Concentração de pipeline — risco de dependência de um negócio`,
          business_area: "operations",
          impact_level: "medium",
          urgency: "this_week",
          explanation: `O negócio "${topOpp.title || "sem título"}" representa ${pct}% do valor total do pipeline (€${Math.round(topValue).toLocaleString("pt")} de €${Math.round(totalValue).toLocaleString("pt")}). Esta concentração cria risco operacional significativo caso o negócio não feche.`,
          recommended_steps: JSON.stringify([
            "Diversificar pipeline com qualificação activa de novos leads esta semana",
            "Acelerar outros negócios em fase avançada para reduzir a dependência",
            "Definir plano de contingência de receita caso este negócio não feche",
          ]),
          rule_key: "concentration",
        });
      }
    }
  }

  if (decisions.length === 0) {
    return { inserted: 0, decisions: [] };
  }

  const { data: inserted, error: insertError } = await supabase
    .from("strategic_decisions")
    .insert(decisions)
    .select();

  if (insertError) throw insertError;

  return { inserted: inserted?.length ?? 0, decisions: inserted ?? [] };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    let body: { workspace_id?: string } = {};
    try {
      body = await req.json();
    } catch {
      /* no body */
    }

    // Cron mode: iterate all workspaces with deal_scores
    if (!body.workspace_id) {
      const { data: workspaces, error } = await supabase
        .from("deal_scores")
        .select("workspace_id")
        .limit(1000);

      if (error) throw error;

      const uniqueIds = [
        ...new Set((workspaces || []).map((r: any) => r.workspace_id)),
      ];
      const results = await Promise.allSettled(
        uniqueIds.map((wid) => computeDecisionsForWorkspace(supabase, wid))
      );

      const succeeded = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.filter((r) => r.status === "rejected").length;

      return new Response(
        JSON.stringify({ success: true, processed: succeeded, failed }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Single workspace mode
    const result = await computeDecisionsForWorkspace(supabase, body.workspace_id);

    return new Response(JSON.stringify({ success: true, ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err: any) {
    console.error("compute-strategic-decisions error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
