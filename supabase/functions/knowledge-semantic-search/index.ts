import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SearchRequest {
  query: string;
  workspaceId: string;
  knowledgeBaseId?: string;
  status?: string;
  threshold?: number;
  limit?: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      query, 
      workspaceId, 
      knowledgeBaseId, 
      status, 
      threshold = 0.6, 
      limit = 20 
    }: SearchRequest = await req.json();

    if (!query || !workspaceId) {
      return new Response(
        JSON.stringify({ error: "query and workspaceId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Generate embedding for the user's query
    const embeddingResponse = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-ada-002",
        input: query
      }),
    });

    if (!embeddingResponse.ok) {
      const errorText = await embeddingResponse.text();
      console.error("Embedding API error:", errorText);
      throw new Error(`Embedding API error: ${embeddingResponse.status}`);
    }

    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData.data[0].embedding;

    // Search for similar entries using the database function
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: results, error } = await supabase.rpc("match_knowledge_entries", {
      query_embedding: queryEmbedding,
      match_threshold: threshold,
      match_count: limit,
      filter_workspace_id: workspaceId,
      filter_knowledge_base_id: knowledgeBaseId || null,
      filter_status: status || null
    });

    if (error) {
      console.error("Database search error:", error);
      throw error;
    }

    console.log(`Semantic search found ${results?.length || 0} results for query: "${query}"`);

    return new Response(
      JSON.stringify({ 
        success: true,
        results: results || [],
        query,
        matchCount: results?.length || 0
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Semantic search error:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        results: []
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
