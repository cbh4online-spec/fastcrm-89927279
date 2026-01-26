import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { 
  chunkOpportunityOutcome, 
  generateEmbeddingText 
} from "../_shared/rag-chunker.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface IndexOutcomeRequest {
  opportunityId: string;
  workspaceId: string;
  outcome: 'won' | 'lost';
  outcomeReason?: string;
  successFactors?: string[];
  failureFactors?: string[];
  lessonsLearned?: string;
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
    
    const body: IndexOutcomeRequest = await req.json();
    const { 
      opportunityId, 
      workspaceId, 
      outcome, 
      outcomeReason,
      successFactors,
      failureFactors,
      lessonsLearned,
    } = body;
    
    if (!opportunityId || !workspaceId || !outcome) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`[RAG-Index] Indexing outcome for opportunity ${opportunityId}: ${outcome}`);
    
    // Fetch opportunity data
    const { data: opportunity, error: fetchError } = await supabase
      .from('opportunities')
      .select('*')
      .eq('id', opportunityId)
      .single();
    
    if (fetchError || !opportunity) {
      console.error('[RAG-Index] Opportunity not found:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Opportunity not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Create semantic chunks from opportunity
    const chunks = chunkOpportunityOutcome(opportunity, outcome, outcomeReason);
    const embeddingText = generateEmbeddingText(chunks);
    
    console.log(`[RAG-Index] Created ${chunks.length} chunks, embedding text: ${embeddingText.length} chars`);
    
    // Generate embedding if OpenAI key available
    let embedding: number[] | null = null;
    
    if (openaiKey && embeddingText.length > 0) {
      try {
        const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'text-embedding-ada-002',
            input: embeddingText.slice(0, 8000), // Limit input
          }),
        });
        
        if (embeddingResponse.ok) {
          const embeddingData = await embeddingResponse.json();
          embedding = embeddingData.data?.[0]?.embedding || null;
          console.log('[RAG-Index] Generated embedding successfully');
        } else {
          console.warn('[RAG-Index] Embedding generation failed:', await embeddingResponse.text());
        }
      } catch (embError) {
        console.error('[RAG-Index] Embedding error:', embError);
      }
    }
    
    // Build entity snapshot
    const entitySnapshot = {
      title: opportunity.title,
      value: opportunity.value,
      probability: opportunity.probability,
      source: opportunity.source,
      notes: opportunity.notes,
      ai_insight: opportunity.ai_insight,
      billing_type: opportunity.billing_type,
      mrr_amount: opportunity.mrr_amount,
      tcv_amount: opportunity.tcv_amount,
    };
    
    // Calculate deal cycle days
    let dealCycleDays: number | null = null;
    if (opportunity.created_at) {
      const created = new Date(opportunity.created_at);
      const closed = new Date();
      dealCycleDays = Math.floor((closed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
    }
    
    // Upsert to rag_historical_outcomes
    const { data: indexed, error: insertError } = await supabase
      .from('rag_historical_outcomes')
      .upsert({
        workspace_id: workspaceId,
        source_entity_id: opportunityId,
        source_entity_type: 'opportunity',
        outcome,
        outcome_reason: outcomeReason || opportunity.lost_reason,
        outcome_value: opportunity.value,
        outcome_date: new Date().toISOString(),
        entity_snapshot: entitySnapshot,
        deal_cycle_days: dealCycleDays,
        final_stage: outcome,
        success_factors: successFactors || [],
        failure_factors: failureFactors || [],
        lessons_learned: lessonsLearned,
        embedding: embedding ? `[${embedding.join(',')}]` : null,
        embedding_text: embeddingText,
        indexed_at: new Date().toISOString(),
      }, {
        onConflict: 'source_entity_id',
      })
      .select()
      .single();
    
    if (insertError) {
      console.error('[RAG-Index] Insert error:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to index outcome', details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Also index chunks to rag_indexed_chunks
    if (chunks.length > 0) {
      const chunkRecords = chunks.map(chunk => ({
        workspace_id: workspaceId,
        source_table: 'rag_historical_outcomes',
        source_id: indexed.id,
        chunk_index: chunk.index,
        chunk_content: chunk.content,
        chunk_metadata: chunk.metadata,
        quality_score: chunk.qualityScore,
      }));
      
      await supabase
        .from('rag_indexed_chunks')
        .upsert(chunkRecords, {
          onConflict: 'source_table,source_id,chunk_index',
        });
      
      console.log(`[RAG-Index] Indexed ${chunkRecords.length} chunks`);
    }
    
    console.log(`[RAG-Index] Successfully indexed outcome ${indexed.id}`);
    
    return new Response(
      JSON.stringify({
        success: true,
        outcomeId: indexed.id,
        chunksIndexed: chunks.length,
        hasEmbedding: !!embedding,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('[RAG-Index] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
