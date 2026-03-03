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

      // Factor 1: Proximity to renewal (25%)
      if (contract.next_renewal_date) {
        const daysUntil = Math.ceil((new Date(contract.next_renewal_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        if (daysUntil < 0) score -= 25;
        else if (daysUntil <= 7) score -= 20;
        else if (daysUntil <= 15) score -= 10;
        else if (daysUntil <= 30) score -= 5;
      }

      // Factor 2: Contract status (25%)
      if (contract.status === "paused") score -= 15;

      // Factor 3: Items with overdue status (25%)
      const { data: items } = await supabase
        .from("renewal_items")
        .select("status, item_type, meta_json")
        .eq("contract_id", contract.id);

      const overdueItems = (items || []).filter(i => i.status === "overdue").length;
      score -= Math.min(25, overdueItems * 10);

      // Factor 4: Hours packs low balance (25%)
      for (const item of (items || [])) {
        if (item.item_type === "hours_pack" && item.meta_json) {
          const meta = item.meta_json as Record<string, any>;
          const pct = meta.hours_included > 0 ? (meta.hours_remaining || 0) / meta.hours_included : 1;
          if (pct <= 0.1) score -= 15;
          else if (pct <= 0.2) score -= 10;
        }
      }

      score = Math.max(0, Math.min(100, score));

      if (score !== contract.health_score) {
        await supabase.from("renewal_contracts").update({ health_score: score }).eq("id", contract.id);
        updated++;
      }
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
