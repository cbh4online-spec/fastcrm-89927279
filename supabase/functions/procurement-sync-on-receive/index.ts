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

    const { purchase_order_id } = await req.json();
    if (!purchase_order_id) {
      return new Response(JSON.stringify({ error: "purchase_order_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get PO with project_id
    const { data: po } = await supabase
      .from("purchase_orders")
      .select("project_id, workspace_id")
      .eq("id", purchase_order_id)
      .single();

    if (!po?.project_id) {
      return new Response(JSON.stringify({ message: "PO has no project, skipping sync" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get PO items with received quantities
    const { data: poItems } = await supabase
      .from("purchase_order_items")
      .select("product_id, variant_id, quantity, received_quantity, rfq_quote_id")
      .eq("order_id", purchase_order_id);

    if (!poItems?.length) {
      return new Response(JSON.stringify({ message: "No PO items" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // For each PO item with rfq_quote_id, find the procurement need and update
    for (const item of poItems) {
      if (!item.rfq_quote_id) continue;

      // Get the need via rfq_quote -> rfq_item -> need_id
      const { data: quote } = await supabase
        .from("rfq_quotes")
        .select("rfq_item_id")
        .eq("id", item.rfq_quote_id)
        .single();

      if (!quote) continue;

      const { data: rfqItem } = await supabase
        .from("rfq_items")
        .select("need_id")
        .eq("id", quote.rfq_item_id)
        .single();

      if (!rfqItem?.need_id) continue;

      const receivedQty = Number(item.received_quantity || 0);
      const orderedQty = Number(item.quantity || 0);
      const fullyReceived = receivedQty >= orderedQty;

      // Update need status
      if (fullyReceived) {
        await supabase
          .from("procurement_needs")
          .update({ status: "resolved" })
          .eq("id", rfqItem.need_id);
      }

      // Update project item
      const { data: need } = await supabase
        .from("procurement_needs")
        .select("project_item_id")
        .eq("id", rfqItem.need_id)
        .single();

      if (need?.project_item_id) {
        const newStatus = fullyReceived ? "received" : receivedQty > 0 ? "partially_received" : "ordered";
        await supabase
          .from("procurement_project_items")
          .update({ procurement_status: newStatus })
          .eq("id", need.project_item_id);
      }
    }

    // Check if all project items are received -> update project status
    const { data: allItems } = await supabase
      .from("procurement_project_items")
      .select("procurement_status")
      .eq("project_id", po.project_id);

    const allReceived = (allItems || []).every((i: any) => i.procurement_status === "received");
    if (allReceived && allItems?.length) {
      await supabase
        .from("procurement_projects")
        .update({ status: "delivered", updated_at: new Date().toISOString() })
        .eq("id", po.project_id);
    }

    return new Response(JSON.stringify({ success: true, project_status: allReceived ? "delivered" : "in_progress" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("procurement-sync-on-receive error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
