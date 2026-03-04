import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { line_id, rfq_item_id } = await req.json();
    if (!line_id) throw new Error("line_id is required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const updateData: any = {
      match_method: "manual",
      match_score: 1.0,
    };

    if (rfq_item_id) {
      updateData.match_rfq_item_id = rfq_item_id;
      updateData.match_status = "matched";
    } else {
      updateData.match_rfq_item_id = null;
      updateData.match_status = "unmatched";
      updateData.match_score = 0;
    }

    const { error } = await supabase
      .from("rfq_quote_import_lines")
      .update(updateData)
      .eq("id", line_id);

    if (error) throw new Error("Update failed: " + error.message);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
