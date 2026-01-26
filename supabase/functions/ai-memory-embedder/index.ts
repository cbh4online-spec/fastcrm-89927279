import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: EmbedRequest = await req.json();
    const { memoryId, batchSize = 10, workspaceId } = body;

    // If specific memory ID provided, embed just that one
    if (memoryId) {
      const result = await embedSingleMemory(supabase, memoryId);
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Otherwise, process batch of memories without embeddings
    const result = await processBatch(supabase, batchSize, workspaceId);
    return new Response(
      JSON.stringify(result),
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

async function embedSingleMemory(supabase: any, memoryId: string) {
  // Get memory content
  const { data: memory, error: fetchError } = await supabase
    .from('ai_agent_memory')
    .select('id, content, memory_type, entity_type')
    .eq('id', memoryId)
    .single();

  if (fetchError || !memory) {
    return { success: false, error: 'Memory not found' };
  }

  // Generate embedding
  const embedding = await generateEmbedding(
    `${memory.memory_type}: ${memory.content}`
  );

  if (!embedding) {
    return { success: false, error: 'Failed to generate embedding' };
  }

  // Update memory with embedding
  const { error: updateError } = await supabase
    .from('ai_agent_memory')
    .update({ embedding: `[${embedding.join(',')}]` })
    .eq('id', memoryId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  return { success: true, memoryId, embeddingSize: embedding.length };
}

async function processBatch(supabase: any, batchSize: number, workspaceId?: string) {
  // Find memories without embeddings
  let query = supabase
    .from('ai_agent_memory')
    .select('id, content, memory_type, entity_type')
    .is('embedding', null)
    .is('superseded_by', null)
    .order('created_at', { ascending: false })
    .limit(batchSize);

  if (workspaceId) {
    query = query.eq('workspace_id', workspaceId);
  }

  const { data: memories, error: fetchError } = await query;

  if (fetchError) {
    return { success: false, error: fetchError.message };
  }

  if (!memories || memories.length === 0) {
    return { success: true, processed: 0, message: 'No memories pending embedding' };
  }

  let processed = 0;
  let failed = 0;
  const errors: string[] = [];

  // Process each memory
  for (const memory of memories) {
    try {
      // Create text for embedding (include type for context)
      const textToEmbed = `${memory.memory_type}: ${memory.content}`;
      
      // Generate embedding
      const embedding = await generateEmbedding(textToEmbed);

      if (!embedding) {
        failed++;
        errors.push(`Failed to generate embedding for ${memory.id}`);
        continue;
      }

      // Update memory with embedding
      const { error: updateError } = await supabase
        .from('ai_agent_memory')
        .update({ embedding: `[${embedding.join(',')}]` })
        .eq('id', memory.id);

      if (updateError) {
        failed++;
        errors.push(`Failed to update ${memory.id}: ${updateError.message}`);
      } else {
        processed++;
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (e: unknown) {
      failed++;
      const errMsg = e instanceof Error ? e.message : 'Unknown error';
      errors.push(`Error processing ${memory.id}: ${errMsg}`);
    }
  }

  // Also process strategic memories
  const strategicResult = await processStrategicBatch(supabase, Math.max(5, batchSize - processed), workspaceId);

  return {
    success: true,
    entityMemories: {
      found: memories.length,
      processed,
      failed,
      errors: errors.length > 0 ? errors : undefined
    },
    strategicMemories: strategicResult,
    message: `Processed ${processed + strategicResult.processed} memories total`
  };
}

async function processStrategicBatch(supabase: any, batchSize: number, workspaceId?: string) {
  let query = supabase
    .from('ai_agent_strategic_memory')
    .select('id, pattern_description, pattern_type')
    .is('embedding', null)
    .eq('is_active', true)
    .limit(batchSize);

  if (workspaceId) {
    query = query.eq('workspace_id', workspaceId);
  }

  const { data: memories, error: fetchError } = await query;

  if (fetchError || !memories || memories.length === 0) {
    return { processed: 0, failed: 0 };
  }

  let processed = 0;
  let failed = 0;

  for (const memory of memories) {
    try {
      const textToEmbed = `${memory.pattern_type} pattern: ${memory.pattern_description}`;
      const embedding = await generateEmbedding(textToEmbed);

      if (!embedding) {
        failed++;
        continue;
      }

      const { error: updateError } = await supabase
        .from('ai_agent_strategic_memory')
        .update({ embedding: `[${embedding.join(',')}]` })
        .eq('id', memory.id);

      if (!updateError) {
        processed++;
      } else {
        failed++;
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (e) {
      failed++;
    }
  }

  return { processed, failed };
}

// Helper: Generate embedding using Lovable AI gateway
async function generateEmbedding(text: string): Promise<number[] | null> {
  try {
    const gatewayUrl = Deno.env.get('LOVABLE_AI_GATEWAY_URL') || 'https://lovable-ai-gateway.lovable.dev';
    
    const response = await fetch(`${gatewayUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
      },
      body: JSON.stringify({
        model: 'text-embedding-ada-002',
        input: text.substring(0, 8000) // Limit input length
      })
    });

    if (!response.ok) {
      console.warn('Embedding generation failed:', response.status);
      return null;
    }

    const data = await response.json();
    return data.data?.[0]?.embedding || null;
  } catch (e) {
    console.warn('Embedding generation error:', e);
    return null;
  }
}
