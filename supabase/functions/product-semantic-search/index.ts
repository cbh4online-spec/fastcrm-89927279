import { aiGate } from '../_shared/ai-gate.ts';
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SearchRequest {
  query: string;
  workspaceId: string;
  limit?: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, workspaceId, limit = 10 }: SearchRequest = await req.json();

    // AI Gate check
    const _gateWsId = typeof workspaceId !== 'undefined' ? workspaceId : (typeof workspace_id !== 'undefined' ? workspace_id : null);
    if (_gateWsId) {
      const gate = await aiGate(_gateWsId, 'medium', 'product-semantic-search');
      if (!gate.allowed) {
        return new Response(JSON.stringify({ error: 'quota_exceeded', upgrade_required: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }


    if (!query || !workspaceId) {
      return new Response(
        JSON.stringify({ success: false, error: "query and workspaceId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Semantic search: "${query}" in workspace ${workspaceId}`);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Use text-based search function
    const { data: products, error: searchError } = await supabase.rpc("match_products", {
      query_text: query,
      match_count: limit,
      filter_workspace_id: workspaceId,
    });

    if (searchError) {
      console.error("Search error:", searchError);
      return new Response(
        JSON.stringify({ success: false, error: "Search failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${products?.length || 0} products for query: "${query}"`);

    return new Response(
      JSON.stringify({
        success: true,
        query,
        products: products || [],
        count: products?.length || 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Semantic search error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
