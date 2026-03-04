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

    const { award_id } = await req.json();
    if (!award_id) {
      return new Response(JSON.stringify({ error: "award_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get award
    const { data: award } = await supabase.from("rfq_awards").select("*").eq("id", award_id).single();
    if (!award) {
      return new Response(JSON.stringify({ error: "Award not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (award.status !== "draft") {
      return new Response(JSON.stringify({ error: "Award already confirmed" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate all items have selected_quote_id
    const { data: awardItems } = await supabase
      .from("rfq_award_items")
      .select("*")
      .eq("award_id", award_id);

    if (!awardItems?.length) {
      return new Response(JSON.stringify({ error: "No items in award" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const missing = awardItems.filter((ai: any) => !ai.selected_quote_id);
    if (missing.length) {
      return new Response(JSON.stringify({
        error: `${missing.length} item(s) sem cotação selecionada`,
        missing_items: missing.map((m: any) => m.rfq_item_id),
      }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark selected quotes as is_selected
    const quoteIds = awardItems.map((ai: any) => ai.selected_quote_id);
    await supabase
      .from("rfq_quotes")
      .update({ is_selected: true })
      .in("id", quoteIds);

    // Update award status
    await supabase
      .from("rfq_awards")
      .update({ status: "awarded", updated_at: new Date().toISOString() })
      .eq("id", award_id);

    // Update RFQ status
    await supabase
      .from("rfqs")
      .update({ status: "awarded", updated_at: new Date().toISOString() })
      .eq("id", award.rfq_id);

    return new Response(JSON.stringify({
      success: true,
      award_id,
      confirmed_items: awardItems.length,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("rfq-award-confirm error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
