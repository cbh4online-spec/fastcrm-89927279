import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { suggestionId } = await req.json();
    if (!suggestionId) throw new Error("Missing suggestionId");

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: suggestion } = await supabase
      .from("client_replenishment_suggestions")
      .select("*")
      .eq("id", suggestionId)
      .single();

    if (!suggestion) throw new Error("Suggestion not found");

    // Mark as converted
    await supabase
      .from("client_replenishment_suggestions")
      .update({ status: "converted" })
      .eq("id", suggestionId);

    // Return items for client-side cart population
    return new Response(JSON.stringify({
      success: true,
      items: suggestion.suggested_items,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
