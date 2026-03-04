import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    let userId: string | null = null;
    if (token) {
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    const { rfq_id, strategy, weights_json } = await req.json();
    if (!rfq_id) {
      return new Response(JSON.stringify({ error: "rfq_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const strat = strategy || "best_per_item";
    const w = weights_json || { price: 45, lead_time: 25, moq: 15, preference: 10, quality: 5 };

    // Call the analyze function internally
    const analyzeResponse = await fetch(`${supabaseUrl}/functions/v1/rfq-analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({ rfq_id, weights: w }),
    });

    const analysis = await analyzeResponse.json();
    if (analysis.error) {
      return new Response(JSON.stringify({ error: analysis.error }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get RFQ workspace
    const { data: rfq } = await supabase.from("rfqs").select("workspace_id").eq("id", rfq_id).single();
    if (!rfq) {
      return new Response(JSON.stringify({ error: "RFQ not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If strategy is consolidation, pick the supplier with most items and best overall cost
    let finalRecommendations = analysis.recommendations;
    
    if (strat === "single_supplier" || strat === "lowest_total_cost") {
      // Find the supplier that can supply most items at best total cost
      const supplierCoverage = new Map<string, { count: number; totalCost: number; items: any[] }>();
      
      for (const item of analysis.matrix) {
        for (const q of item.quotes) {
          const entry = supplierCoverage.get(q.supplier_id) || { count: 0, totalCost: 0, items: [] };
          entry.count++;
          entry.totalCost += q.line_total;
          entry.items.push({ rfq_item_id: item.rfq_item_id, quote: q });
          supplierCoverage.set(q.supplier_id, entry);
        }
      }

      // Rank suppliers by coverage then cost
      const ranked = Array.from(supplierCoverage.entries())
        .sort((a, b) => {
          if (b[1].count !== a[1].count) return b[1].count - a[1].count;
          return a[1].totalCost - b[1].totalCost;
        });

      if (ranked.length > 0) {
        const [bestSupplierId, bestData] = ranked[0];
        finalRecommendations = bestData.items.map((it: any) => ({
          rfq_item_id: it.rfq_item_id,
          product_name: analysis.matrix.find((m: any) => m.rfq_item_id === it.rfq_item_id)?.product_name || "",
          qty_required: it.quote.qty_required || analysis.matrix.find((m: any) => m.rfq_item_id === it.rfq_item_id)?.qty || 0,
          recommended_supplier_id: bestSupplierId,
          recommended_quote_id: it.quote.quote_id,
          score: 0,
          score_breakdown: {},
          rationale: `Consolidação: fornecedor cobre ${bestData.count} itens. Custo total: €${bestData.totalCost.toFixed(2)}.`,
          top3: [],
          risk_flags: it.quote.risk_flags || [],
        }));
      }
    } else if (strat === "fastest_delivery") {
      // For each item, pick supplier with lowest lead time
      finalRecommendations = analysis.matrix.map((item: any) => {
        const sorted = [...item.quotes].sort((a: any, b: any) => (a.lead_time_days || 999) - (b.lead_time_days || 999));
        const best = sorted[0];
        if (!best) return null;
        return {
          rfq_item_id: item.rfq_item_id,
          product_name: item.product_name,
          qty_required: item.qty,
          recommended_supplier_id: best.supplier_id,
          recommended_quote_id: best.quote_id,
          score: 0,
          score_breakdown: {},
          rationale: `Entrega mais rápida: ${best.lead_time_days || "N/A"} dias.`,
          top3: sorted.slice(0, 3).map((q: any) => ({
            supplier_id: q.supplier_id,
            supplier_name: q.supplier_name,
            quote_id: q.quote_id,
            score: 0,
            net_price: q.effective_unit_price,
            lead_time: q.lead_time_days,
          })),
          risk_flags: best.risk_flags || [],
        };
      }).filter(Boolean);
    }

    // Create award in draft
    const { data: award, error: awardErr } = await supabase
      .from("rfq_awards")
      .insert({
        workspace_id: rfq.workspace_id,
        rfq_id,
        status: "draft",
        strategy: strat,
        weights_json: w,
        analysis_json: analysis,
        created_by: userId,
      })
      .select()
      .single();

    if (awardErr) throw awardErr;

    // Create award items
    const awardItems = finalRecommendations.map((r: any) => ({
      workspace_id: rfq.workspace_id,
      award_id: award.id,
      rfq_item_id: r.rfq_item_id,
      selected_supplier_id: r.recommended_supplier_id,
      selected_quote_id: r.recommended_quote_id,
      selected_qty: r.qty_required,
      rationale_text: r.rationale,
      score_json: r.score_breakdown,
      rank_alternatives: r.top3 || [],
    }));

    const { error: itemsErr } = await supabase.from("rfq_award_items").insert(awardItems);
    if (itemsErr) throw itemsErr;

    return new Response(JSON.stringify({
      award_id: award.id,
      strategy: strat,
      items_count: awardItems.length,
      summary: `Adjudicação criada com ${awardItems.length} itens usando estratégia "${strat}".`,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("rfq-recommend-award error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
