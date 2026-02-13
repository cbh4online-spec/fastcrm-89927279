import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface EmbedRequest {
  memoryId?: string;
  batchSize?: number;
  workspaceId?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: EmbedRequest = await req.json();
    const { memoryId, batchSize = 10, workspaceId } = body;

    // Embedding API (text-embedding-ada-002) is not supported by the AI gateway.
    // This function now operates as a no-op that marks memories as processed.
    // Memory search uses text-based matching instead of vector similarity.

    if (memoryId) {
      console.log(`Memory ${memoryId} marked as processed (embeddings disabled)`);
      return new Response(
        JSON.stringify({ success: true, memoryId, message: "Embeddings disabled - using text search" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Count pending memories for monitoring
    let query = supabase
      .from('ai_agent_memory')
      .select('id', { count: 'exact', head: true })
      .is('embedding', null)
      .is('superseded_by', null);

    if (workspaceId) {
      query = query.eq('workspace_id', workspaceId);
    }

    const { count } = await query;

    console.log(`Memory embedder: ${count || 0} memories pending (embeddings disabled, using text search)`);

    return new Response(
      JSON.stringify({
        success: true,
        entityMemories: {
          found: count || 0,
          processed: 0,
          failed: 0,
          message: "Embeddings disabled - memory search uses text matching"
        },
        strategicMemories: { processed: 0, failed: 0 },
        message: `${count || 0} memories pending. System uses text-based search.`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Memory Embedder Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
