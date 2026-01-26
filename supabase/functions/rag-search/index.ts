import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { retrieve } from "../_shared/rag-retriever.ts";
import { buildContextInjection, generateRAGSummary } from "../_shared/rag-context-builder.ts";
import { DEFAULT_RAG_GUARDRAILS } from "../_shared/rag-types.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RAGSearchRequest {
  workspaceId: string;
  entityId: string;
  entityType: string;
  entityData?: Record<string, unknown>;
  queryText?: string;
  filters?: {
    outcome?: 'won' | 'lost' | 'all';
    industry?: string;
  };
  limits?: {
    maxChunks?: number;
    relevanceThreshold?: number;
    maxTokens?: number;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const body: RAGSearchRequest = await req.json();
    const { 
      workspaceId, 
      entityId, 
      entityType, 
      entityData,
      queryText,
      filters,
      limits,
    } = body;
    
    if (!workspaceId || !entityId || !entityType) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: workspaceId, entityId, entityType' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`[RAG-Search] Processing request for ${entityType} ${entityId}`);
    
    // Build query text from entity data if not provided
    let finalQueryText = queryText;
    if (!finalQueryText && entityData) {
      // Build query from entity fields
      const parts: string[] = [];
      if (entityData.title) parts.push(String(entityData.title));
      if (entityData.name) parts.push(String(entityData.name));
      if (entityData.notes) parts.push(String(entityData.notes).slice(0, 500));
      if (entityData.ai_insight) parts.push(String(entityData.ai_insight));
      if (entityData.source) parts.push(`Origem: ${entityData.source}`);
      finalQueryText = parts.join(' ');
    }
    
    if (!finalQueryText || finalQueryText.length < 10) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Insufficient query context',
          context: null,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Generate embedding for query
    let queryEmbedding: number[] | null = null;
    
    if (openaiKey) {
      try {
        const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'text-embedding-ada-002',
            input: finalQueryText.slice(0, 8000),
          }),
        });
        
        if (embeddingResponse.ok) {
          const embeddingData = await embeddingResponse.json();
          queryEmbedding = embeddingData.data?.[0]?.embedding || null;
          console.log('[RAG-Search] Generated query embedding');
        }
      } catch (embError) {
        console.error('[RAG-Search] Embedding error:', embError);
      }
    }
    
    // Build RAG query
    const ragQuery = {
      text: finalQueryText,
      entityContext: {
        entityId,
        entityType,
        entityData: entityData || {},
      },
      filters: {
        outcome: filters?.outcome,
        industry: filters?.industry,
      },
      limits: {
        maxChunks: limits?.maxChunks,
        relevanceThreshold: limits?.relevanceThreshold,
        maxTokens: limits?.maxTokens,
      },
    };
    
    // Apply custom guardrails if provided
    const guardrails = {
      ...DEFAULT_RAG_GUARDRAILS,
      ...(limits?.relevanceThreshold && { relevanceThreshold: limits.relevanceThreshold }),
      ...(limits?.maxTokens && { maxRAGContextTokens: limits.maxTokens }),
      ...(limits?.maxChunks && { maxFinalContextChunks: limits.maxChunks }),
    };
    
    // Execute hierarchical retrieval
    const retrievalResult = await retrieve(
      supabase,
      workspaceId,
      ragQuery,
      queryEmbedding,
      guardrails
    );
    
    console.log(`[RAG-Search] Retrieved ${retrievalResult.totalUsed}/${retrievalResult.totalRetrieved} results`);
    
    // Build context injection
    const contextInjection = buildContextInjection(
      retrievalResult,
      guardrails.maxRAGContextTokens
    );
    
    // Log metrics
    try {
      await supabase.from('rag_retrieval_metrics').insert({
        workspace_id: workspaceId,
        agent_type: entityType,
        query_type: 'search',
        chunks_retrieved: retrievalResult.totalRetrieved,
        chunks_used: retrievalResult.totalUsed,
        avg_relevance_score: retrievalResult.avgRelevance,
        retrieval_time_ms: retrievalResult.retrievalTimeMs,
        context_tokens_used: contextInjection.tokenCount,
      });
    } catch (metricsError) {
      console.warn('[RAG-Search] Failed to log metrics:', metricsError);
    }
    
    // Generate summary
    const summary = generateRAGSummary(retrievalResult);
    
    return new Response(
      JSON.stringify({
        success: retrievalResult.success,
        context: contextInjection.formattedContext,
        tokenCount: contextInjection.tokenCount,
        confidenceLevel: contextInjection.confidenceLevel,
        sourcesUsed: contextInjection.sources.length,
        sources: contextInjection.sources,
        summary,
        metrics: {
          totalRetrieved: retrievalResult.totalRetrieved,
          totalUsed: retrievalResult.totalUsed,
          avgRelevance: retrievalResult.avgRelevance,
          retrievalTimeMs: retrievalResult.retrievalTimeMs,
        },
        warnings: retrievalResult.warnings,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('[RAG-Search] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error', 
        details: errorMessage 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
