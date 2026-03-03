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

    const { rfq_id, selected_quote_ids } = await req.json();
    if (!rfq_id || !selected_quote_ids?.length) {
      return new Response(JSON.stringify({ error: "rfq_id and selected_quote_ids required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get RFQ for workspace_id and project_id
    const { data: rfq } = await supabase.from("rfqs").select("*").eq("id", rfq_id).single();
    if (!rfq) {
      return new Response(JSON.stringify({ error: "RFQ not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark selected quotes
    await supabase
      .from("rfq_quotes")
      .update({ is_selected: true })
      .in("id", selected_quote_ids);

    // Fetch selected quotes with item details
    const { data: quotes } = await supabase
      .from("rfq_quotes")
      .select("*, rfq_items:rfq_item_id(product_id, variant_id, qty, need_id)")
      .in("id", selected_quote_ids);

    if (!quotes?.length) {
      return new Response(JSON.stringify({ error: "No quotes found" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Group by supplier
    const supplierGroups = new Map<string, any[]>();
    for (const q of quotes) {
      if (!supplierGroups.has(q.supplier_id)) supplierGroups.set(q.supplier_id, []);
      supplierGroups.get(q.supplier_id)!.push(q);
    }

    const createdPOs: string[] = [];

    for (const [supplierId, groupQuotes] of supplierGroups) {
      const totalAmount = groupQuotes.reduce((sum: number, q: any) => {
        const qty = q.rfq_items?.qty || 0;
        return sum + (Number(q.unit_price) * Number(qty));
      }, 0);

      // Create PO
      const { data: po, error: poErr } = await supabase
        .from("purchase_orders")
        .insert({
          workspace_id: rfq.workspace_id,
          supplier_id: supplierId,
          project_id: rfq.project_id,
          rfq_id: rfq.id,
          total_amount: totalAmount,
          status: "draft",
          created_by: userId,
        })
        .select()
        .single();

      if (poErr) throw poErr;

      // Create PO items
      const poItems = groupQuotes.map((q: any) => ({
        order_id: po.id,
        product_id: q.rfq_items?.product_id,
        variant_id: q.rfq_items?.variant_id || null,
        quantity: q.rfq_items?.qty || 0,
        unit_price: q.unit_price,
        rfq_quote_id: q.id,
      }));

      await supabase.from("purchase_order_items").insert(poItems);
      createdPOs.push(po.id);

      // Update procurement needs to ordered
      const needIds = groupQuotes
        .map((q: any) => q.rfq_items?.need_id)
        .filter(Boolean);
      if (needIds.length) {
        await supabase
          .from("procurement_needs")
          .update({ status: "ordered" })
          .in("id", needIds);
      }
    }

    // Update RFQ status
    await supabase
      .from("rfqs")
      .update({ status: "awarded", updated_at: new Date().toISOString() })
      .eq("id", rfq_id);

    // Update project items procurement_status
    if (rfq.project_id) {
      const allNeedIds = quotes
        .map((q: any) => q.rfq_items?.need_id)
        .filter(Boolean);
      if (allNeedIds.length) {
        const { data: needs } = await supabase
          .from("procurement_needs")
          .select("project_item_id")
          .in("id", allNeedIds);
        const projItemIds = [...new Set((needs || []).map((n: any) => n.project_item_id).filter(Boolean))];
        if (projItemIds.length) {
          await supabase
            .from("procurement_project_items")
            .update({ procurement_status: "ordered" })
            .in("id", projItemIds);
        }
      }
    }

    return new Response(JSON.stringify({ purchase_order_ids: createdPOs, count: createdPOs.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("rfq-award-and-create-pos error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
