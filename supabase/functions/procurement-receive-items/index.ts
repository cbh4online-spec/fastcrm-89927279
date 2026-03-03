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

    // Get auth user from request
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    let userId: string | null = null;
    if (token) {
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    const { workspace_id, purchase_order_id, items, notes } = await req.json() as {
      workspace_id: string;
      purchase_order_id: string;
      items: { order_item_id: string; quantity_received: number }[];
      notes?: string;
    };

    if (!workspace_id || !purchase_order_id || !items?.length) {
      return new Response(JSON.stringify({ error: "workspace_id, purchase_order_id and items required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create goods_receipt
    const { data: receipt, error: rErr } = await supabase
      .from("goods_receipts")
      .insert({
        workspace_id,
        purchase_order_id,
        received_by: userId,
        notes,
      })
      .select()
      .single();

    if (rErr) throw rErr;

    // Insert goods_receipt_items (trigger handles stock + cost updates)
    const { error: iErr } = await supabase
      .from("goods_receipt_items")
      .insert(items.map(i => ({
        receipt_id: receipt.id,
        order_item_id: i.order_item_id,
        quantity_received: i.quantity_received,
      })));

    if (iErr) throw iErr;

    // Update PO status based on received quantities
    const { data: poItems } = await supabase
      .from("purchase_order_items")
      .select("quantity, received_quantity")
      .eq("order_id", purchase_order_id);

    const allReceived = (poItems || []).every(
      (i: any) => (Number(i.received_quantity) || 0) >= (Number(i.quantity) || 0)
    );
    const anyReceived = (poItems || []).some(
      (i: any) => (Number(i.received_quantity) || 0) > 0
    );

    const newStatus = allReceived ? "received" : anyReceived ? "partial" : "confirmed";
    await supabase.from("purchase_orders").update({ status: newStatus, updated_at: new Date().toISOString() }).eq("id", purchase_order_id);

    return new Response(JSON.stringify({ receipt_id: receipt.id, po_status: newStatus }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("procurement-receive-items error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
