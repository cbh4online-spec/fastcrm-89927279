import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get all active contracts
    const { data: contracts, error } = await supabase
      .from("renewal_contracts")
      .select("id, workspace_id, next_renewal_date, status, total_mrr")
      .in("status", ["active", "paused"]);

    if (error) throw error;

    let updated = 0;

    for (const contract of (contracts || [])) {
      let score = 100;
      const reasons: string[] = [];

      // Factor 1: Proximity to renewal (25%)
      if (contract.next_renewal_date) {
        const daysUntil = Math.ceil((new Date(contract.next_renewal_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        if (daysUntil < 0) {
          score -= 25;
          reasons.push(`Renovação em atraso há ${Math.abs(daysUntil)} dias`);
        } else if (daysUntil <= 7) {
          score -= 20;
          reasons.push(`Renovação em ${daysUntil} dias`);
        } else if (daysUntil <= 15) {
          score -= 10;
          reasons.push(`Renovação próxima (${daysUntil} dias)`);
        } else if (daysUntil <= 30) {
          score -= 5;
        }
      }

      // Factor 2: Contract status (25%)
      if (contract.status === "paused") {
        score -= 15;
        reasons.push("Contrato pausado");
      }

      // Factor 3: Items with overdue status (25%)
      const { data: items } = await supabase
        .from("renewal_items")
        .select("status, item_type, meta_json")
        .eq("contract_id", contract.id);

      const overdueItems = (items || []).filter(i => i.status === "overdue");
      if (overdueItems.length > 0) {
        score -= Math.min(25, overdueItems.length * 10);
        reasons.push(`${overdueItems.length} item(ns) em atraso`);
      }

      // Factor 4: Hours packs low balance (25%)
      for (const item of (items || [])) {
        if (item.item_type === "hours_pack" && item.meta_json) {
          const meta = item.meta_json as Record<string, any>;
          const pct = meta.hours_included > 0 ? (meta.hours_remaining || 0) / meta.hours_included : 1;
          if (pct <= 0.1) {
            score -= 15;
            reasons.push(`Pack de horas quase esgotado (${Math.round(pct * 100)}%)`);
          } else if (pct <= 0.2) {
            score -= 10;
            reasons.push(`Pack de horas baixo (${Math.round(pct * 100)}%)`);
          }
        }
      }

      // Factor 5: Check renewal events for failed history
      const { data: events } = await supabase
        .from("renewal_events")
        .select("event_type")
        .eq("contract_id", contract.id)
        .eq("event_type", "overdue")
        .limit(5);

      if (events && events.length >= 3) {
        score -= 10;
        reasons.push("Histórico de atrasos recorrentes");
      }

      score = Math.max(0, Math.min(100, score));

      // Determine risk level
      let riskLevel: string = "low";
      if (score < 40) riskLevel = "high";
      else if (score < 70) riskLevel = "medium";

      // Top 3 reasons
      const topReasons = reasons.slice(0, 3);

      // Suggested next action
      let suggestedAction = "Monitorizar";
      if (riskLevel === "high") suggestedAction = "Contactar cliente urgentemente";
      else if (riskLevel === "medium") suggestedAction = "Agendar revisão do contrato";

      const reasonsJson = {
        reasons: topReasons,
        suggested_action: suggestedAction,
        updated_at: new Date().toISOString(),
      };

      await supabase.from("renewal_contracts").update({
        health_score: score,
        risk_level: riskLevel,
        reasons_json: reasonsJson,
      }).eq("id", contract.id);
      updated++;
    }

    return new Response(JSON.stringify({ success: true, contracts_checked: contracts?.length || 0, updated }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in renewals-health-score:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
