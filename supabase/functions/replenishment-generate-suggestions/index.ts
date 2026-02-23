import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { workspaceId, companyId } = await req.json();
    if (!workspaceId || !companyId) throw new Error("Missing workspaceId or companyId");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get order history for this company
    const { data: orders } = await supabase
      .from("order_notes")
      .select("id, created_at, status, items:order_note_items(product_id, product_name, quantity, unit_price_net)")
      .eq("workspace_id", workspaceId)
      .in("status", ["invoiced", "delivered", "completed"])
      .order("created_at", { ascending: false })
      .limit(50);

    if (!orders || orders.length === 0) {
      return new Response(JSON.stringify({ suggestions: [], reason: "Sem histórico suficiente" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Calculate product purchase cadence
    const productMap = new Map<string, { name: string; dates: Date[]; totalQty: number; avgPrice: number }>();
    for (const order of orders) {
      for (const item of (order.items || [])) {
        const existing = productMap.get(item.product_id);
        if (existing) {
          existing.dates.push(new Date(order.created_at));
          existing.totalQty += item.quantity;
        } else {
          productMap.set(item.product_id, {
            name: item.product_name,
            dates: [new Date(order.created_at)],
            totalQty: item.quantity,
            avgPrice: item.unit_price_net,
          });
        }
      }
    }

    // Find products due for reorder (simple cadence)
    const now = new Date();
    const suggestions: any[] = [];

    for (const [productId, info] of productMap) {
      if (info.dates.length < 2) continue;
      const sorted = info.dates.sort((a, b) => a.getTime() - b.getTime());
      const intervals = [];
      for (let i = 1; i < sorted.length; i++) {
        intervals.push((sorted[i].getTime() - sorted[i - 1].getTime()) / (1000 * 60 * 60 * 24));
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const lastPurchase = sorted[sorted.length - 1];
      const daysSince = (now.getTime() - lastPurchase.getTime()) / (1000 * 60 * 60 * 24);

      if (daysSince >= avgInterval * 0.8) {
        const avgQty = Math.ceil(info.totalQty / info.dates.length);
        suggestions.push({
          product_id: productId,
          product_name: info.name,
          suggested_qty: avgQty,
          unit_price_net: info.avgPrice,
          reason: `Cadência média: ${Math.round(avgInterval)} dias. Último pedido há ${Math.round(daysSince)} dias.`,
          confidence: Math.min(0.95, 0.5 + (info.dates.length * 0.1)),
        });
      }
    }

    // Store suggestion if any
    if (suggestions.length > 0) {
      await supabase.from("client_replenishment_suggestions").insert({
        workspace_id: workspaceId,
        company_id: companyId,
        suggested_items: suggestions,
        reason: `Reposição baseada em padrão de ${orders.length} encomendas`,
        confidence_score: suggestions.reduce((s, sg) => s + sg.confidence, 0) / suggestions.length,
        status: "new",
      });
    }

    return new Response(JSON.stringify({ suggestions, count: suggestions.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
