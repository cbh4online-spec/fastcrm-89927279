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

    const { rfq_id } = await req.json();
    if (!rfq_id) {
      return new Response(JSON.stringify({ error: "rfq_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date().toISOString();

    // Update RFQ suppliers sent_at
    await supabase
      .from("rfq_suppliers")
      .update({ sent_at: now, status: "invited" })
      .eq("rfq_id", rfq_id);

    // Update RFQ status
    await supabase
      .from("rfqs")
      .update({ status: "sent", updated_at: now })
      .eq("id", rfq_id);

    // Get related needs via rfq_items
    const { data: rfqItems } = await supabase
      .from("rfq_items")
      .select("need_id")
      .eq("rfq_id", rfq_id)
      .not("need_id", "is", null);

    const needIds = (rfqItems || []).map((i: any) => i.need_id).filter(Boolean);
    if (needIds.length) {
      await supabase
        .from("procurement_needs")
        .update({ status: "rfq_in_progress" })
        .in("id", needIds);
    }

    return new Response(JSON.stringify({ success: true, suppliers_notified: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("rfq-send error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
