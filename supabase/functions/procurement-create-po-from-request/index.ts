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

    const { workspace_id, request_id } = await req.json() as {
      workspace_id: string;
      request_id: string;
    };

    if (!workspace_id || !request_id) {
      return new Response(JSON.stringify({ error: "workspace_id and request_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify request is approved
    const { data: request, error: reqErr } = await supabase
      .from("purchase_requests")
      .select("*")
      .eq("id", request_id)
      .eq("workspace_id", workspace_id)
      .single();

    if (reqErr || !request) {
      return new Response(JSON.stringify({ error: "Request not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (request.status !== "approved") {
      return new Response(JSON.stringify({ error: "Request must be approved before converting to PO" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get request items
    const { data: items } = await supabase
      .from("purchase_request_items")
      .select("*")
      .eq("request_id", request_id);

    if (!items?.length) {
      return new Response(JSON.stringify({ error: "No items in request" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Group items by chosen_supplier_id (fallback to suggested_supplier_id, then request.supplier_id)
    const supplierGroups = new Map<string, typeof items>();
    for (const item of items) {
      const supplierId = item.chosen_supplier_id || item.suggested_supplier_id || request.supplier_id;
      if (!supplierId) continue;
      if (!supplierGroups.has(supplierId)) supplierGroups.set(supplierId, []);
      supplierGroups.get(supplierId)!.push(item);
    }

    if (supplierGroups.size === 0) {
      return new Response(JSON.stringify({ error: "No supplier assigned to items. Choose suppliers first." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const createdPOs: string[] = [];

    for (const [supplierId, groupItems] of supplierGroups) {
      const totalAmount = groupItems.reduce((sum, i) => {
        const price = i.chosen_unit_price || i.estimated_unit_price || 0;
        return sum + (Number(price) * Number(i.quantity));
      }, 0);

      // Create PO
      const { data: po, error: poErr } = await supabase
        .from("purchase_orders")
        .insert({
          workspace_id,
          supplier_id: supplierId,
          request_id: request_id,
          total_amount: totalAmount,
          expected_delivery: request.expected_delivery || null,
          notes: request.notes || null,
          created_by: userId,
          status: "draft",
        })
        .select()
        .single();

      if (poErr) throw poErr;

      // Create PO items
      const { error: itemsErr } = await supabase
        .from("purchase_order_items")
        .insert(groupItems.map(i => ({
          order_id: po.id,
          product_id: i.product_id,
          variant_id: i.variant_id || null,
          description: i.description,
          quantity: i.quantity,
          unit_price: i.chosen_unit_price || i.estimated_unit_price || 0,
        })));

      if (itemsErr) throw itemsErr;
      createdPOs.push(po.id);
    }

    // Update request status to converted
    await supabase
      .from("purchase_requests")
      .update({ status: "converted", updated_at: new Date().toISOString() })
      .eq("id", request_id);

    return new Response(JSON.stringify({ purchase_order_ids: createdPOs, count: createdPOs.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("procurement-create-po-from-request error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
