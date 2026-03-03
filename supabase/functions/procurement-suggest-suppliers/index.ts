import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ItemRequest {
  product_id: string;
  variant_id?: string;
  requested_qty: number;
}

interface SupplierCandidate {
  supplier_id: string;
  supplier_name: string;
  unit_price: number;
  lead_time_days: number | null;
  is_preferred: boolean;
  quality_score: number | null;
  reliability_score: number | null;
  min_order_qty: number;
}

interface ScoredSupplier extends SupplierCandidate {
  score: number;
  reason: string;
}

function scoreSuppliers(
  candidates: SupplierCandidate[],
  defaultSupplierId: string | null,
  requestedQty: number
): ScoredSupplier[] {
  if (!candidates.length) return [];

  const prices = candidates.map(c => c.unit_price).filter(p => p > 0);
  const leadTimes = candidates.map(c => c.lead_time_days).filter((l): l is number => l !== null && l > 0);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const minLead = leadTimes.length ? Math.min(...leadTimes) : 0;
  const maxLead = leadTimes.length ? Math.max(...leadTimes) : 0;

  return candidates.map(c => {
    // Price score (35%)
    let priceScore = 100;
    if (maxPrice > minPrice && c.unit_price > 0) {
      priceScore = 100 - ((c.unit_price - minPrice) / (maxPrice - minPrice)) * 100;
    }

    // Lead time score (20%)
    let leadScore = 50; // default if unknown
    if (c.lead_time_days !== null && maxLead > minLead) {
      leadScore = 100 - ((c.lead_time_days - minLead) / (maxLead - minLead)) * 100;
    } else if (c.lead_time_days !== null && maxLead === minLead) {
      leadScore = 100;
    }

    // Preferred score (15%)
    let prefScore = c.is_preferred ? 100 : 0;
    if (defaultSupplierId && c.supplier_id === defaultSupplierId) prefScore += 12;

    // Reliability (15%)
    const reliabilityScore = c.reliability_score ? c.reliability_score * 20 : 50;

    // Quality (15%)
    const qualityScore = c.quality_score ? c.quality_score * 20 : 50;

    let score = priceScore * 0.35 + leadScore * 0.20 + Math.min(prefScore, 100) * 0.15 + reliabilityScore * 0.15 + qualityScore * 0.15;

    // Penalty if min_order_qty > requested_qty
    if (c.min_order_qty > requestedQty) {
      score -= 10;
    }

    const reasons: string[] = [];
    if (priceScore >= 80) reasons.push("Melhor preço");
    if (leadScore >= 80) reasons.push("Lead time curto");
    if (c.is_preferred) reasons.push("Preferido");
    if (defaultSupplierId === c.supplier_id) reasons.push("Fornecedor padrão");
    if (c.reliability_score && c.reliability_score >= 4) reasons.push("Alta fiabilidade");
    if (c.quality_score && c.quality_score >= 4) reasons.push("Alta qualidade");
    if (c.min_order_qty > requestedQty) reasons.push("MOQ acima do pedido");

    return {
      ...c,
      score: Math.round(Math.max(0, Math.min(100, score))),
      reason: reasons.join(", ") || "Candidato disponível",
    };
  }).sort((a, b) => b.score - a.score);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { workspace_id, items } = await req.json() as { workspace_id: string; items: ItemRequest[] };

    if (!workspace_id || !items?.length) {
      return new Response(JSON.stringify({ error: "workspace_id and items required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const productIds = items.map(i => i.product_id);

    // Fetch products for default_supplier_id
    const { data: products } = await supabase
      .from("products")
      .select("id, default_supplier_id")
      .in("id", productIds);

    const productMap = new Map((products || []).map(p => [p.id, p]));

    // Fetch all supplier_products for these products
    const { data: spRows } = await supabase
      .from("supplier_products")
      .select("*, supplier:suppliers(id, name, status)")
      .eq("workspace_id", workspace_id)
      .in("product_id", productIds);

    const itemSuggestions = [];

    for (const item of items) {
      const product = productMap.get(item.product_id);
      const candidates: SupplierCandidate[] = (spRows || [])
        .filter((sp: any) => {
          if (sp.product_id !== item.product_id) return false;
          if (item.variant_id && sp.variant_id && sp.variant_id !== item.variant_id) return false;
          if (sp.supplier?.status === "inactive") return false;
          return true;
        })
        .map((sp: any) => ({
          supplier_id: sp.supplier_id,
          supplier_name: sp.supplier?.name || "—",
          unit_price: Number(sp.unit_price) || 0,
          lead_time_days: sp.lead_time_days,
          is_preferred: sp.is_preferred,
          quality_score: sp.quality_score ? Number(sp.quality_score) : null,
          reliability_score: sp.reliability_score ? Number(sp.reliability_score) : null,
          min_order_qty: Number(sp.min_order_qty) || 1,
        }));

      const scored = scoreSuppliers(candidates, product?.default_supplier_id || null, item.requested_qty);
      const top3 = scored.slice(0, 3);

      // Check if AI tiebreaker needed
      let aiExplanation: string | undefined;
      if (top3.length >= 2 && Math.abs(top3[0].score - top3[1].score) < 5) {
        const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
        if (LOVABLE_API_KEY) {
          try {
            const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                model: "google/gemini-3-flash-preview",
                messages: [
                  { role: "system", content: "És um especialista em procurement. Responde em português, máximo 2 frases." },
                  { role: "user", content: `Dois fornecedores empatados para compra:\n1) ${top3[0].supplier_name}: preço €${top3[0].unit_price}, lead ${top3[0].lead_time_days ?? '?'} dias, score ${top3[0].score}\n2) ${top3[1].supplier_name}: preço €${top3[1].unit_price}, lead ${top3[1].lead_time_days ?? '?'} dias, score ${top3[1].score}\nQual recomendar e porquê?` }
                ],
              }),
            });
            if (aiResp.ok) {
              const aiData = await aiResp.json();
              aiExplanation = aiData.choices?.[0]?.message?.content;
            }
          } catch { /* ignore AI failure, deterministic result stands */ }
        }
      }

      itemSuggestions.push({
        product_id: item.product_id,
        variant_id: item.variant_id || null,
        top3: top3.map(s => ({
          supplier_id: s.supplier_id,
          supplier_name: s.supplier_name,
          score: s.score,
          unit_price: s.unit_price,
          lead_time: s.lead_time_days,
          reason: s.reason,
        })),
        recommended_supplier_id: top3[0]?.supplier_id || null,
        suggested_unit_price: top3[0]?.unit_price || null,
        ai_explanation: aiExplanation || null,
      });
    }

    return new Response(JSON.stringify({ item_suggestions: itemSuggestions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("procurement-suggest-suppliers error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
