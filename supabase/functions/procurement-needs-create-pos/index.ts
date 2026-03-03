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

    const { workspace_id, need_ids } = await req.json();
    if (!workspace_id || !need_ids?.length) {
      return new Response(JSON.stringify({ error: "workspace_id and need_ids required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get needs with supplier recommendations
    const { data: needs } = await supabase
      .from("procurement_needs")
      .select("*, products:product_id(name, sku)")
      .eq("workspace_id", workspace_id)
      .in("id", need_ids)
      .in("status", ["open", "rfq_in_progress"]);

    if (!needs?.length) {
      return new Response(JSON.stringify({ error: "No eligible needs found" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Group needs by recommended supplier
    const bySupplier = new Map<string, any[]>();
    const noSupplier: any[] = [];
    for (const need of needs) {
      if (need.recommended_supplier_id) {
        const list = bySupplier.get(need.recommended_supplier_id) || [];
        list.push(need);
        bySupplier.set(need.recommended_supplier_id, list);
      } else {
        noSupplier.push(need);
      }
    }

    if (noSupplier.length > 0) {
      return new Response(JSON.stringify({
        error: `${noSupplier.length} need(s) have no recommended supplier`,
        needs_without_supplier: noSupplier.map((n: any) => n.id),
      }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate sequential PO number
    const { data: lastPo } = await supabase
      .from("purchase_orders")
      .select("order_number")
      .eq("workspace_id", workspace_id)
      .order("created_at", { ascending: false })
      .limit(1);

    let seqNum = 1;
    if (lastPo?.[0]?.order_number) {
      const match = lastPo[0].order_number.match(/(\d+)$/);
      if (match) seqNum = parseInt(match[1]) + 1;
    }
    const year = new Date().getFullYear();

    const createdPOs: string[] = [];

    for (const [supplierId, supplierNeeds] of bySupplier.entries()) {
      const orderNumber = `PO-${year}-${String(seqNum++).padStart(5, "0")}`;
      const totalAmount = supplierNeeds.reduce((sum: number, n: any) =>
        sum + (n.shortage * (n.suggested_unit_price || 0)), 0);

      const { data: po, error: poErr } = await supabase
        .from("purchase_orders")
        .insert({
          workspace_id,
          supplier_id: supplierId,
          order_number: orderNumber,
          status: "draft",
          total_amount: totalAmount,
          created_by: userId,
        })
        .select()
        .single();

      if (poErr) throw poErr;

      // Create PO items
      const poItems = supplierNeeds.map((n: any) => ({
        order_id: po.id,
        product_id: n.product_id,
        variant_id: n.variant_id,
        description: (n.products as any)?.name || "Produto",
        quantity: n.shortage,
        unit_price: n.suggested_unit_price || 0,
        received_quantity: 0,
      }));

      const { error: itemsErr } = await supabase.from("purchase_order_items").insert(poItems);
      if (itemsErr) throw itemsErr;

      createdPOs.push(po.id);

      // Update needs status to ordered
      await supabase
        .from("procurement_needs")
        .update({ status: "ordered", updated_at: new Date().toISOString() })
        .in("id", supplierNeeds.map((n: any) => n.id));
    }

    return new Response(JSON.stringify({
      message: "POs created successfully",
      purchase_order_ids: createdPOs,
      count: createdPOs.length,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("Error in procurement-needs-create-pos:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
