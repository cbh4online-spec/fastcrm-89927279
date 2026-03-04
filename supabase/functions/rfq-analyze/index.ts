import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface NormalizedQuote {
  quote_id: string;
  rfq_item_id: string;
  supplier_id: string;
  supplier_name: string;
  unit_price: number;
  discount_percent: number;
  vat_percent: number;
  net_unit_price: number;
  unit_price_with_vat: number;
  effective_unit_price: number;
  lead_time_days: number | null;
  min_order_qty: number | null;
  pack_size: number | null;
  qty_required: number;
  line_total: number;
  overbuy_qty: number;
  overbuy_cost: number;
  risk_flags: string[];
  notes: string | null;
  supplier_ref: string | null;
}

interface ItemRecommendation {
  rfq_item_id: string;
  product_name: string;
  qty_required: number;
  recommended_supplier_id: string;
  recommended_quote_id: string;
  score: number;
  score_breakdown: Record<string, number>;
  rationale: string;
  top3: Array<{
    supplier_id: string;
    supplier_name: string;
    quote_id: string;
    score: number;
    net_price: number;
    lead_time: number | null;
  }>;
  risk_flags: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { rfq_id, weights } = await req.json();
    if (!rfq_id) {
      return new Response(JSON.stringify({ error: "rfq_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Default weights
    const w = {
      price: weights?.price ?? 45,
      lead_time: weights?.lead_time ?? 25,
      moq: weights?.moq ?? 15,
      preference: weights?.preference ?? 10,
      quality: weights?.quality ?? 5,
    };

    // Fetch RFQ
    const { data: rfq } = await supabase.from("rfqs").select("*").eq("id", rfq_id).single();
    if (!rfq) {
      return new Response(JSON.stringify({ error: "RFQ not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch items with product info
    const { data: items } = await supabase
      .from("rfq_items")
      .select("*, products:product_id(id, name, sku)")
      .eq("rfq_id", rfq_id)
      .order("line_number");

    if (!items?.length) {
      return new Response(JSON.stringify({ error: "No items in RFQ" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all quotes with supplier info
    const { data: quotes } = await supabase
      .from("rfq_quotes")
      .select("*, suppliers:supplier_id(id, name, rating_manual)")
      .eq("rfq_id", rfq_id)
      .in("status", ["submitted", "draft"]);

    if (!quotes?.length) {
      return new Response(JSON.stringify({ error: "No quotes found" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch supplier_products for preference/quality
    const supplierIds = [...new Set(quotes.map((q: any) => q.supplier_id))];
    const productIds = [...new Set(items.map((i: any) => i.product_id).filter(Boolean))];
    
    const { data: supplierProducts } = await supabase
      .from("supplier_products")
      .select("*")
      .in("supplier_id", supplierIds)
      .in("product_id", productIds);

    const spMap = new Map<string, any>();
    (supplierProducts || []).forEach((sp: any) => {
      spMap.set(`${sp.supplier_id}_${sp.product_id}`, sp);
    });

    // Normalize all quotes
    const normalizedQuotes: NormalizedQuote[] = [];

    for (const q of quotes) {
      const item = items.find((i: any) => i.id === q.rfq_item_id);
      if (!item) continue;

      const qtyRequired = item.qty || 1;
      const discount = Number(q.discount_percent) || 0;
      const vat = Number(q.vat_percent) || 0;
      const unitPrice = Number(q.unit_price) || 0;
      const packSize = Number(q.pack_size) || 1;
      const moq = Number(q.min_order_qty) || 0;

      const netUnitPrice = unitPrice * (1 - discount / 100);
      const unitPriceWithVat = netUnitPrice * (1 + vat / 100);
      
      // Effective unit price considering pack size
      const effectiveUnitPrice = packSize > 1 ? netUnitPrice / packSize : netUnitPrice;

      // Calculate overbuy
      const effectiveQty = moq > qtyRequired ? moq : qtyRequired;
      const overbuyQty = effectiveQty - qtyRequired;
      const overbuyPercent = qtyRequired > 0 ? (overbuyQty / qtyRequired) * 100 : 0;

      const lineTotal = effectiveQty * effectiveUnitPrice;

      // Risk flags
      const riskFlags: string[] = [];
      if (q.lead_time_days && q.lead_time_days > 30) riskFlags.push("lead_time_high");
      if (overbuyPercent > 50) riskFlags.push("high_overbuy");
      if (moq > 0 && moq > qtyRequired * 3) riskFlags.push("moq_excessive");
      if (!q.lead_time_days) riskFlags.push("no_lead_time");

      normalizedQuotes.push({
        quote_id: q.id,
        rfq_item_id: q.rfq_item_id,
        supplier_id: q.supplier_id,
        supplier_name: (q.suppliers as any)?.name || "Unknown",
        unit_price: unitPrice,
        discount_percent: discount,
        vat_percent: vat,
        net_unit_price: netUnitPrice,
        unit_price_with_vat: unitPriceWithVat,
        effective_unit_price: effectiveUnitPrice,
        lead_time_days: q.lead_time_days,
        min_order_qty: moq || null,
        pack_size: q.pack_size,
        qty_required: qtyRequired,
        line_total: lineTotal,
        overbuy_qty: overbuyQty,
        overbuy_cost: overbuyQty * effectiveUnitPrice,
        risk_flags: riskFlags,
        notes: q.notes,
        supplier_ref: q.supplier_ref,
      });
    }

    // Score and recommend per item (best_per_item)
    const recommendations: ItemRecommendation[] = [];

    for (const item of items) {
      const itemQuotes = normalizedQuotes.filter(nq => nq.rfq_item_id === item.id);
      if (!itemQuotes.length) continue;

      // Calculate min/max for normalization
      const prices = itemQuotes.map(q => q.effective_unit_price);
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const priceRange = maxPrice - minPrice;

      const leadTimes = itemQuotes.map(q => q.lead_time_days || 999).filter(lt => lt < 999);
      const minLead = leadTimes.length ? Math.min(...leadTimes) : 0;
      const maxLead = leadTimes.length ? Math.max(...leadTimes) : 1;
      const leadRange = maxLead - minLead;

      const scored = itemQuotes.map(q => {
        // Price score (lower is better)
        const priceScore = priceRange > 0
          ? ((maxPrice - q.effective_unit_price) / priceRange) * 100
          : 100;

        // Lead time score (lower is better)
        const lt = q.lead_time_days || 999;
        const leadTimeScore = leadRange > 0
          ? ((maxLead - lt) / leadRange) * 100
          : (lt < 999 ? 100 : 0);

        // MOQ/overbuy score (less overbuy is better)
        const overbuyRatio = q.qty_required > 0 ? q.overbuy_qty / q.qty_required : 0;
        const moqScore = Math.max(0, 100 - overbuyRatio * 100);

        // Preference score
        const sp = spMap.get(`${q.supplier_id}_${item.product_id}`);
        const isPreferred = sp?.is_preferred || false;
        const prefScore = isPreferred ? 100 : 50;

        // Quality score from supplier rating
        const supplierData = quotes.find((oq: any) => oq.supplier_id === q.supplier_id);
        const rating = (supplierData?.suppliers as any)?.rating_manual;
        const qualityScore = rating ? (rating / 5) * 100 : 50;

        const total = (priceScore * w.price + leadTimeScore * w.lead_time + moqScore * w.moq + prefScore * w.preference + qualityScore * w.quality) / 100;

        return {
          ...q,
          score: Math.round(total * 100) / 100,
          score_breakdown: {
            price: Math.round(priceScore),
            lead_time: Math.round(leadTimeScore),
            moq: Math.round(moqScore),
            preference: Math.round(prefScore),
            quality: Math.round(qualityScore),
          },
        };
      });

      scored.sort((a, b) => b.score - a.score);
      const best = scored[0];

      // Build rationale
      const reasons: string[] = [];
      if (best.score_breakdown.price >= 80) reasons.push("melhor preço");
      if (best.score_breakdown.lead_time >= 80) reasons.push("lead time curto");
      if (best.overbuy_qty === 0) reasons.push("sem sobrecompra");
      if (best.score_breakdown.preference >= 80) reasons.push("fornecedor preferido");
      const rationale = reasons.length
        ? `Recomendado: ${reasons.join(", ")}. Score: ${best.score}/100.`
        : `Score mais alto: ${best.score}/100.`;

      recommendations.push({
        rfq_item_id: item.id,
        product_name: (item.products as any)?.name || "Produto",
        qty_required: item.qty,
        recommended_supplier_id: best.supplier_id,
        recommended_quote_id: best.quote_id,
        score: best.score,
        score_breakdown: best.score_breakdown,
        rationale,
        top3: scored.slice(0, 3).map(s => ({
          supplier_id: s.supplier_id,
          supplier_name: s.supplier_name,
          quote_id: s.quote_id,
          score: s.score,
          net_price: s.effective_unit_price,
          lead_time: s.lead_time_days,
        })),
        risk_flags: best.risk_flags,
      });
    }

    // Consolidation suggestion
    const supplierItemCount = new Map<string, number>();
    const supplierTotalCost = new Map<string, number>();
    recommendations.forEach(r => {
      const sid = r.recommended_supplier_id;
      supplierItemCount.set(sid, (supplierItemCount.get(sid) || 0) + 1);
    });
    normalizedQuotes.forEach(nq => {
      supplierTotalCost.set(nq.supplier_id, (supplierTotalCost.get(nq.supplier_id) || 0) + nq.line_total);
    });

    const uniqueSuppliers = new Set(recommendations.map(r => r.recommended_supplier_id)).size;
    const consolidationSuggestion = uniqueSuppliers > 2
      ? `Recomendação atual usa ${uniqueSuppliers} fornecedores. Considere consolidar para reduzir POs.`
      : null;

    // Build matrix data
    const matrix = items.map((item: any) => ({
      rfq_item_id: item.id,
      product_name: (item.products as any)?.name || "Produto",
      sku: (item.products as any)?.sku || "",
      qty: item.qty,
      unit: item.unit,
      quotes: normalizedQuotes
        .filter(nq => nq.rfq_item_id === item.id)
        .map(nq => ({
          quote_id: nq.quote_id,
          supplier_id: nq.supplier_id,
          supplier_name: nq.supplier_name,
          net_unit_price: nq.net_unit_price,
          effective_unit_price: nq.effective_unit_price,
          unit_price_with_vat: nq.unit_price_with_vat,
          lead_time_days: nq.lead_time_days,
          min_order_qty: nq.min_order_qty,
          pack_size: nq.pack_size,
          line_total: nq.line_total,
          overbuy_qty: nq.overbuy_qty,
          discount_percent: nq.discount_percent,
          vat_percent: nq.vat_percent,
          risk_flags: nq.risk_flags,
          supplier_ref: nq.supplier_ref,
        })),
    }));

    const result = {
      rfq_id,
      matrix,
      recommendations,
      consolidation_suggestion: consolidationSuggestion,
      weights_used: w,
      total_items: items.length,
      total_quoted_items: recommendations.length,
      supplier_summary: Array.from(new Set(normalizedQuotes.map(nq => nq.supplier_id))).map(sid => ({
        supplier_id: sid,
        supplier_name: normalizedQuotes.find(nq => nq.supplier_id === sid)?.supplier_name || "",
        items_quoted: normalizedQuotes.filter(nq => nq.supplier_id === sid).length,
        total_cost: normalizedQuotes.filter(nq => nq.supplier_id === sid).reduce((s, nq) => s + nq.line_total, 0),
      })),
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("rfq-analyze error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
