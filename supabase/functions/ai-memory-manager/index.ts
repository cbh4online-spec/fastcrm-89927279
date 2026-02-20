import "https://deno.land/x/xhr@0.1.0/mod.ts";

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

interface StoreMemoryRequest {
  workspaceId: string;
  entityId: string;
  entityType: string;
  memoryType: string;
  content: string;
  relevanceScore?: number;
  memoryCategory?: string;
  sourceExecutionId?: string;
  expiresInDays?: number;
}

interface RetrieveMemoryRequest {
  workspaceId: string;
  entityId: string;
  entityType: string;
  queryText?: string;
  maxResults?: number;
  minRelevance?: number;
  includeStrategic?: boolean;
}

interface ValidateMemoryRequest {
  memoryId: string;
  isValid: boolean;
}

interface ConsolidateRequest {
  workspaceId: string;
  entityId?: string;
  entityType?: string;
}

interface StatsRequest {
  workspaceId: string;
  entityId: string;
  entityType: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const action = url.pathname.split('/').pop();

    // Route to appropriate handler
    switch (action) {
      case 'store': {
        const body: StoreMemoryRequest = await req.json();
        return await handleStore(supabase, body);
      }
      
      case 'retrieve': {
        const body: RetrieveMemoryRequest = await req.json();
        return await handleRetrieve(supabase, body);
      }
      
      case 'validate': {
        const body: ValidateMemoryRequest = await req.json();
        return await handleValidate(supabase, body);
      }
      
      case 'consolidate': {
        const body: ConsolidateRequest = await req.json();
        return await handleConsolidate(supabase, body);
      }
      
      case 'stats': {
        const body: StatsRequest = await req.json();
        return await handleStats(supabase, body);
      }
      
      default:
        return new Response(
          JSON.stringify({ error: 'Unknown action', validActions: ['store', 'retrieve', 'validate', 'consolidate', 'stats'] }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error: unknown) {
    console.error('Memory Manager Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function handleStore(supabase: any, body: StoreMemoryRequest) {
  const {
    workspaceId,
    entityId,
    entityType,
    memoryType,
    content,
    relevanceScore = 1.0,
    memoryCategory = 'general',
    sourceExecutionId,
    expiresInDays = 90
  } = body;

  // Validate required fields
  if (!workspaceId || !entityId || !entityType || !memoryType || !content) {
    return new Response(
      JSON.stringify({ error: 'Missing required fields: workspaceId, entityId, entityType, memoryType, content' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Validate content length
  if (content.length > 2000) {
    console.warn('Memory content truncated from', content.length, 'to 2000 chars');
  }

  // Use the store_entity_memory function
  const { data, error } = await supabase.rpc('store_entity_memory', {
    p_workspace_id: workspaceId,
    p_entity_id: entityId,
    p_entity_type: entityType,
    p_memory_type: memoryType,
    p_content: content,
    p_relevance_score: Math.min(relevanceScore, 1.0),
    p_memory_category: memoryCategory,
    p_source_execution_id: sourceExecutionId || null,
    p_expires_in_days: expiresInDays,
    p_created_by: null
  });

  if (error) {
    console.error('Store memory error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ 
      success: true, 
      memoryId: data,
      message: 'Memory stored successfully'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleRetrieve(supabase: any, body: RetrieveMemoryRequest) {
  const {
    workspaceId,
    entityId,
    entityType,
    queryText,
    maxResults = 10,
    minRelevance = 0.3,
    includeStrategic = false
  } = body;

  // Validate required fields
  if (!workspaceId || !entityId || !entityType) {
    return new Response(
      JSON.stringify({ error: 'Missing required fields: workspaceId, entityId, entityType' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  let queryEmbedding = null;
  let usedSemantic = false;

  // Generate embedding for semantic search if query provided
  if (queryText && queryText.length > 0) {
    try {
      const embeddingResponse = await generateEmbedding(queryText);
      if (embeddingResponse) {
        queryEmbedding = embeddingResponse;
        usedSemantic = true;
      }
    } catch (e) {
      console.warn('Failed to generate embedding for semantic search:', e);
    }
  }

  // Use the retrieve_entity_memories function
  const { data: memories, error } = await supabase.rpc('retrieve_entity_memories', {
    p_workspace_id: workspaceId,
    p_entity_id: entityId,
    p_entity_type: entityType,
    p_query_embedding: queryEmbedding ? `[${queryEmbedding.join(',')}]` : null,
    p_max_results: maxResults,
    p_min_relevance: minRelevance,
    p_include_strategic: includeStrategic
  });

  if (error) {
    console.error('Retrieve memories error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Get strategic memories if requested
  let strategicMemories: any[] = [];
  if (includeStrategic) {
    const { data: strategic, error: stratError } = await supabase
      .from('ai_agent_strategic_memory')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('is_active', true)
      .contains('entity_types', [entityType])
      .order('confidence_score', { ascending: false })
      .limit(5);

    if (!stratError && strategic) {
      strategicMemories = strategic;
    }
  }

  // Build prompt context
  const promptContext = buildPromptContext(memories || []);

  return new Response(
    JSON.stringify({
      success: true,
      memories: memories || [],
      strategicMemories,
      promptContext,
      metadata: {
        totalRetrieved: (memories || []).length,
        usedSemanticSearch: usedSemantic,
        queryText: queryText || null
      }
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleValidate(supabase: any, body: ValidateMemoryRequest) {
  const { memoryId, isValid } = body;

  if (!memoryId) {
    return new Response(
      JSON.stringify({ error: 'Missing required field: memoryId' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const { data, error } = await supabase.rpc('validate_memory', {
    p_memory_id: memoryId,
    p_is_valid: isValid,
    p_validated_by: null
  });

  if (error) {
    console.error('Validate memory error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ 
      success: data,
      message: isValid ? 'Memory validated' : 'Memory invalidated'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleConsolidate(supabase: any, body: ConsolidateRequest) {
  const { workspaceId, entityId, entityType } = body;

  if (!workspaceId) {
    return new Response(
      JSON.stringify({ error: 'Missing required field: workspaceId' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const { data, error } = await supabase.rpc('consolidate_entity_memories', {
    p_workspace_id: workspaceId,
    p_entity_id: entityId || null,
    p_entity_type: entityType || null
  });

  if (error) {
    console.error('Consolidate memories error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ 
      success: true,
      consolidated: data,
      message: `Consolidated ${data} memories`
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleStats(supabase: any, body: StatsRequest) {
  const { workspaceId, entityId, entityType } = body;

  if (!workspaceId || !entityId || !entityType) {
    return new Response(
      JSON.stringify({ error: 'Missing required fields: workspaceId, entityId, entityType' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const { data, error } = await supabase.rpc('get_entity_memory_stats', {
    p_workspace_id: workspaceId,
    p_entity_id: entityId,
    p_entity_type: entityType
  });

  if (error) {
    console.error('Get memory stats error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ 
      success: true,
      stats: data
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
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

// Helper: Build prompt context from memories
function buildPromptContext(memories: any[]): {
  knownFacts: string[];
  preferences: string[];
  historicalPatterns: string[];
  recentSignals: string[];
  risks: string[];
  overallConfidence: 'high' | 'medium' | 'low';
  staleDataWarning?: string;
} {
  const context = {
    knownFacts: [] as string[],
    preferences: [] as string[],
    historicalPatterns: [] as string[],
    recentSignals: [] as string[],
    risks: [] as string[],
    overallConfidence: 'medium' as 'high' | 'medium' | 'low',
    staleDataWarning: undefined as string | undefined
  };

  if (!memories || memories.length === 0) {
    context.overallConfidence = 'low';
    return context;
  }

  // Calculate average score for confidence
  const avgScore = memories.reduce((sum, m) => sum + (m.combined_score || 0.5), 0) / memories.length;
  const validatedCount = memories.filter(m => m.is_validated).length;
  
  if (avgScore > 0.7 && validatedCount > memories.length / 2) {
    context.overallConfidence = 'high';
  } else if (avgScore < 0.4 || validatedCount === 0) {
    context.overallConfidence = 'low';
  }

  // Check for stale data
  const oldestDate = memories.reduce((oldest, m) => {
    const date = new Date(m.created_at);
    return date < oldest ? date : oldest;
  }, new Date());
  
  const daysSinceOldest = (Date.now() - oldestDate.getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceOldest > 60) {
    context.staleDataWarning = `Algumas memórias têm mais de ${Math.round(daysSinceOldest)} dias. Verifique se ainda são relevantes.`;
  }

  // Categorize memories
  for (const memory of memories) {
    const content = memory.content;
    const type = memory.memory_type;
    const category = memory.memory_category;

    switch (type) {
      case 'fact':
        context.knownFacts.push(content);
        break;
      case 'preference':
        context.preferences.push(content);
        break;
      case 'pattern':
        context.historicalPatterns.push(content);
        break;
      case 'important_signal':
      case 'conclusion':
        context.recentSignals.push(content);
        break;
      case 'risk':
      case 'objection':
        context.risks.push(content);
        break;
      default:
        // Categorize by memory_category if type doesn't match
        if (category === 'contact_preference') {
          context.preferences.push(content);
        } else if (category === 'price_sensitivity' || category === 'competitive') {
          context.risks.push(content);
        } else {
          context.knownFacts.push(content);
        }
    }
  }

  return context;
}
