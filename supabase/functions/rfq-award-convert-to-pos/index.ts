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

    const { award_id } = await req.json();
    if (!award_id) {
      return new Response(JSON.stringify({ error: "award_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get award with RFQ info
    const { data: award } = await supabase
      .from("rfq_awards")
      .select("*, rfqs:rfq_id(id, workspace_id, project_id)")
      .eq("id", award_id)
      .single();

    if (!award) {
      return new Response(JSON.stringify({ error: "Award not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (award.status !== "awarded") {
      return new Response(JSON.stringify({ error: "Award must be confirmed before converting to POs" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get award items with quote and item details
    const { data: awardItems } = await supabase
      .from("rfq_award_items")
      .select("*, rfq_items:rfq_item_id(product_id, variant_id, need_id, qty), rfq_quotes:selected_quote_id(unit_price, discount_percent)")
      .eq("award_id", award_id);

    if (!awardItems?.length) {
      return new Response(JSON.stringify({ error: "No items in award" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rfqData = award.rfqs as any;

    // Group by supplier
    const supplierGroups = new Map<string, any[]>();
    for (const ai of awardItems) {
      if (!supplierGroups.has(ai.selected_supplier_id)) supplierGroups.set(ai.selected_supplier_id, []);
      supplierGroups.get(ai.selected_supplier_id)!.push(ai);
    }

    const createdPOs: string[] = [];

    for (const [supplierId, groupItems] of supplierGroups) {
      const totalAmount = groupItems.reduce((sum: number, ai: any) => {
        const quote = ai.rfq_quotes as any;
        const unitPrice = Number(quote?.unit_price) || 0;
        const discount = Number(quote?.discount_percent) || 0;
        const netPrice = unitPrice * (1 - discount / 100);
        const qty = Number(ai.selected_qty) || Number(ai.rfq_items?.qty) || 0;
        return sum + (netPrice * qty);
      }, 0);

      // Create PO
      const { data: po, error: poErr } = await supabase
        .from("purchase_orders")
        .insert({
          workspace_id: award.workspace_id,
          supplier_id: supplierId,
          project_id: rfqData?.project_id || null,
          rfq_id: rfqData?.id || award.rfq_id,
          total_amount: totalAmount,
          status: "draft",
          created_by: userId,
        })
        .select()
        .single();

      if (poErr) throw poErr;

      // Create PO items
      const poItems = groupItems.map((ai: any) => {
        const quote = ai.rfq_quotes as any;
        const unitPrice = Number(quote?.unit_price) || 0;
        const discount = Number(quote?.discount_percent) || 0;
        const netPrice = unitPrice * (1 - discount / 100);

        return {
          order_id: po.id,
          product_id: ai.rfq_items?.product_id || null,
          variant_id: ai.rfq_items?.variant_id || null,
          description: ai.rationale_text || "Item adjudicado",
          quantity: Number(ai.selected_qty) || Number(ai.rfq_items?.qty) || 0,
          unit_price: netPrice,
          rfq_quote_id: ai.selected_quote_id,
        };
      });

      await supabase.from("purchase_order_items").insert(poItems);
      createdPOs.push(po.id);

      // Update procurement needs to ordered
      const needIds = groupItems
        .map((ai: any) => ai.rfq_items?.need_id)
        .filter(Boolean);
      if (needIds.length) {
        await supabase
          .from("procurement_needs")
          .update({ status: "ordered" })
          .in("id", needIds);
      }
    }

    // Update award status
    await supabase
      .from("rfq_awards")
      .update({ status: "converted_to_po", updated_at: new Date().toISOString() })
      .eq("id", award_id);

    // Update RFQ status
    await supabase
      .from("rfqs")
      .update({ status: "awarded", updated_at: new Date().toISOString() })
      .eq("id", award.rfq_id);

    // Update project items if applicable
    if (rfqData?.project_id) {
      const allNeedIds = awardItems
        .map((ai: any) => ai.rfq_items?.need_id)
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

    return new Response(JSON.stringify({
      purchase_order_ids: createdPOs,
      count: createdPOs.length,
      award_status: "converted_to_po",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("rfq-award-convert-to-pos error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
