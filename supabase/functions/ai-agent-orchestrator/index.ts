import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { withCache } from '../_shared/cache-manager.ts';
import type { CacheConfidenceLevel } from '../_shared/cache-types.ts';

/**
 * AI Agent Orchestrator
 * 
 * Central dispatcher for all CRM AI agents.
 * Responsibilities:
 * - Route requests to the correct specialized agent
 * - Apply rate limiting and validation
 * - Record executions in audit trail
 * - Format outputs according to contract
 * - Leverage response caching for cost optimization
 */

interface AgentRequest {
  agentType: 'lead' | 'contact' | 'opportunity' | 'client';
  entityId: string;
  entityType: string;
  triggerType: 'manual' | 'entity_created' | 'status_changed' | 'time_based' | 'message_received';
  workspaceId: string;
  context?: Record<string, unknown>;
}

interface ReasoningStep {
  step: number;
  action: string;
  input: string;
  output: string;
  confidence: number;
  durationMs?: number;
  toolUsed?: string;
}

interface AgentOutput {
  executiveSummary: string;
  statusAssessment: string;
  keySignals: string[];
  riskIndicators: string[];
  recommendedAction: string;
  recommendedActionType: string;
  confidenceLevel: 'low' | 'medium' | 'high';
  score?: number;
  temperature?: 'cold' | 'warm' | 'hot';
}

interface AgentResponse {
  success: boolean;
  executionId: string;
  output: AgentOutput;
  reasoningTrace: ReasoningStep[];
  dataSourcesUsed: string[];
  durationMs: number;
  tokensUsed: number;
  error?: string;
  partialAnalysis?: boolean;
  missingData?: string[];
}

// Guardrails - matching client-side config
const GUARDRAILS = {
  maxReasoningIterations: 5,
  maxToolCallsPerExecution: 10,
  executionTimeoutMs: 30000,
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  
  try {
    // Validate auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Validate user
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getUser(token);
    
    if (claimsError || !claimsData?.user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.user.id;

    // Parse request
    const body: AgentRequest = await req.json();
    const { agentType, entityId, entityType, triggerType, workspaceId, context } = body;

    // Validate required fields
    if (!agentType || !entityId || !entityType || !triggerType || !workspaceId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: agentType, entityId, entityType, triggerType, workspaceId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate agent type
    if (!['lead', 'contact', 'opportunity', 'client'].includes(agentType)) {
      return new Response(
        JSON.stringify({ error: `Invalid agent type: ${agentType}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify workspace membership
    const { data: memberCheck, error: memberError } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .maybeSingle();

    if (memberError || !memberCheck) {
      return new Response(
        JSON.stringify({ error: 'Not a member of this workspace' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Orchestrator] Processing ${agentType} agent for entity ${entityId}, trigger: ${triggerType}`);

    // Fetch entity data based on type
    let entityData: any = null;
    const dataSourcesUsed: string[] = [];
    const reasoningTrace: ReasoningStep[] = [];
    
    // Step 1: Fetch entity data
    const step1Start = Date.now();
    try {
      const tableName = getTableName(entityType);
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', entityId)
        .eq('workspace_id', workspaceId)
        .maybeSingle();
      
      if (error) throw error;
      entityData = data;
      dataSourcesUsed.push(tableName);
      
      reasoningTrace.push({
        step: 1,
        action: 'Fetch entity data',
        input: `${tableName}/${entityId}`,
        output: entityData ? 'Data retrieved successfully' : 'Entity not found',
        confidence: entityData ? 1.0 : 0.0,
        durationMs: Date.now() - step1Start,
        toolUsed: 'get_entity_data',
      });
    } catch (e) {
      const err = e as Error;
      reasoningTrace.push({
        step: 1,
        action: 'Fetch entity data',
        input: `${entityType}/${entityId}`,
        output: `Error: ${err.message}`,
        confidence: 0.0,
        durationMs: Date.now() - step1Start,
        toolUsed: 'get_entity_data',
      });
    }

    if (!entityData) {
      return new Response(
        JSON.stringify({ 
          error: 'Entity not found',
          partialAnalysis: true,
          missingData: ['entity_data']
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Fetch related conversations (for leads/contacts)
    let conversationData: any[] = [];
    if (['lead', 'contact'].includes(agentType)) {
      const step2Start = Date.now();
      try {
        const { data: convData } = await supabase
          .from('conversations')
          .select('id, status, unread_count, updated_at')
          .eq(agentType === 'lead' ? 'lead_id' : 'contact_id', entityId)
          .eq('workspace_id', workspaceId)
          .order('updated_at', { ascending: false })
          .limit(5);
        
        conversationData = convData || [];
        if (conversationData.length > 0) {
          dataSourcesUsed.push('conversations');
        }
        
        reasoningTrace.push({
          step: 2,
          action: 'Fetch conversation history',
          input: `${agentType}_id: ${entityId}`,
          output: `Found ${conversationData.length} conversations`,
          confidence: conversationData.length > 0 ? 0.9 : 0.5,
          durationMs: Date.now() - step2Start,
          toolUsed: 'get_conversation_history',
        });
      } catch (e) {
        const err = e as Error;
        reasoningTrace.push({
          step: 2,
          action: 'Fetch conversation history',
          input: `${agentType}_id: ${entityId}`,
          output: `Error: ${err.message}`,
          confidence: 0.0,
          durationMs: Date.now() - step2Start,
          toolUsed: 'get_conversation_history',
        });
      }
    }

    // Step 3: Fetch previous agent conclusions using semantic retrieval
    let previousConclusions: any[] = [];
    let memoryContext: { 
      knownFacts: string[]; 
      preferences: string[]; 
      patterns: string[]; 
      risks: string[]; 
    } = { knownFacts: [], preferences: [], patterns: [], risks: [] };
    
    const step3Start = Date.now();
    try {
      // Use the new retrieve_entity_memories function for intelligent retrieval
      const { data: memoryData, error: memoryError } = await supabase.rpc(
        'retrieve_entity_memories',
        {
          p_workspace_id: workspaceId,
          p_entity_id: entityId,
          p_entity_type: entityType,
          p_max_results: 10,
          p_min_relevance: 0.3,
          p_include_strategic: true
        }
      );
      
      if (memoryError) {
        console.log('[Orchestrator] retrieve_entity_memories not available, falling back to basic query');
        // Fallback to basic query if function doesn't exist
        const { data: fallbackData } = await supabase
          .from('ai_agent_memory')
          .select('id, content, memory_type, memory_category, relevance_score, is_validated, created_at')
          .eq('entity_id', entityId)
          .eq('workspace_id', workspaceId)
          .is('superseded_by', null)
          .order('relevance_score', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(10);
        
        previousConclusions = fallbackData || [];
      } else {
        previousConclusions = memoryData || [];
        
        // Update access counts for retrieved memories
        if (previousConclusions.length > 0) {
          const memoryIds = previousConclusions.map((m: any) => m.id);
          for (const memoryId of memoryIds) {
            await supabase
              .from('ai_agent_memory')
              .update({ 
                last_accessed_at: new Date().toISOString()
              })
              .eq('id', memoryId);
          }
        }
      }
      
      // Categorize memories for structured prompt injection
      for (const memory of previousConclusions) {
        const category = memory.memory_category || 'general';
        const memoryType = memory.memory_type || 'conclusion';
        
        if (memoryType === 'fact' || memory.is_validated) {
          memoryContext.knownFacts.push(memory.content);
        } else if (memoryType === 'preference' || category === 'contact_preference') {
          memoryContext.preferences.push(memory.content);
        } else if (memoryType === 'pattern' || memoryType === 'objection') {
          memoryContext.patterns.push(memory.content);
        } else if (memoryType === 'risk') {
          memoryContext.risks.push(memory.content);
        } else {
          memoryContext.knownFacts.push(memory.content);
        }
      }
      
      if (previousConclusions.length > 0) {
        dataSourcesUsed.push('ai_agent_memory');
      }
      
      reasoningTrace.push({
        step: 3,
        action: 'Retrieve previous conclusions (semantic)',
        input: `entity: ${entityId}, using retrieve_entity_memories()`,
        output: `Found ${previousConclusions.length} memories: ${memoryContext.knownFacts.length} facts, ${memoryContext.preferences.length} preferences, ${memoryContext.patterns.length} patterns, ${memoryContext.risks.length} risks`,
        confidence: previousConclusions.length > 0 ? 0.85 : 0.5,
        durationMs: Date.now() - step3Start,
        toolUsed: 'retrieve_entity_memories',
      });
    } catch (e) {
      const err = e as Error;
      console.error('[Orchestrator] Memory retrieval error:', err);
      reasoningTrace.push({
        step: 3,
        action: 'Retrieve previous conclusions',
        input: `entity: ${entityId}`,
        output: `Error: ${err.message}`,
        confidence: 0.0,
        durationMs: Date.now() - step3Start,
        toolUsed: 'retrieve_entity_memories',
      });
    }

    // Step 4: Generate analysis with cache layer
    const step4Start = Date.now();
    
    // Use cache layer for analysis
    const cacheResult = await withCache(
      supabase,
      {
        workspaceId,
        agentType,
        entityId,
        entityType,
        entityData,
        memories: previousConclusions,
        triggerType,
      },
      async () => {
        // This function is called on cache miss
        const analysis = generateAgentAnalysis(
          agentType,
          entityData,
          conversationData,
          previousConclusions,
          context
        );
        
        return {
          response: analysis,
          confidenceLevel: analysis.confidenceLevel as CacheConfidenceLevel,
          durationMs: Date.now() - step4Start,
          tokensUsed: 0, // Rule-based analysis uses 0 tokens
        };
      }
    );
    
    const analysis = cacheResult.response!;
    
    reasoningTrace.push({
      step: 4,
      action: cacheResult.fromCache ? 'Retrieved from cache' : 'Generate analysis',
      input: `Agent type: ${agentType}, data sources: ${dataSourcesUsed.join(', ')}`,
      output: cacheResult.fromCache 
        ? `Cache HIT (${cacheResult.lookupTimeMs}ms)` 
        : `Generated ${analysis.keySignals.length} signals, ${analysis.riskIndicators.length} risks`,
      confidence: analysis.confidenceLevel === 'high' ? 0.9 : analysis.confidenceLevel === 'medium' ? 0.7 : 0.5,
      durationMs: cacheResult.fromCache ? cacheResult.lookupTimeMs : Date.now() - step4Start,
      toolUsed: cacheResult.fromCache ? 'cache_lookup' : 'calculate_score',
    });

    const durationMs = Date.now() - startTime;

    // Only record execution and store memory if NOT from cache
    let executionId = 'cached';
    
    if (!cacheResult.fromCache) {
      // Record execution in audit trail
      const { data: executionRecord, error: insertError } = await supabase
        .from('ai_agent_executions')
        .insert({
          workspace_id: workspaceId,
          agent_type: agentType,
          entity_id: entityId,
          entity_type: entityType,
          trigger_type: triggerType,
          input_summary: {
            entityName: entityData.name || entityData.title || entityId,
            conversationCount: conversationData.length,
            previousConclusionsCount: previousConclusions.length,
            context: context || {},
          },
          reasoning_trace: reasoningTrace,
          output: analysis,
          executive_summary: analysis.executiveSummary,
          status_assessment: analysis.statusAssessment,
          key_signals: analysis.keySignals,
          risk_indicators: analysis.riskIndicators,
          recommended_action: analysis.recommendedAction,
          recommended_action_type: analysis.recommendedActionType,
          confidence_level: analysis.confidenceLevel,
          duration_ms: durationMs,
          tokens_used: 0,
        })
        .select('id')
        .single();

      if (insertError) {
        console.error('[Orchestrator] Failed to record execution:', insertError);
      }
      
      executionId = executionRecord?.id || 'unknown';

      // Store important conclusion in memory using store_entity_memory function
      if (analysis.confidenceLevel !== 'low') {
        try {
          const { error: storeError } = await supabase.rpc(
            'store_entity_memory',
            {
              p_workspace_id: workspaceId,
              p_entity_id: entityId,
              p_entity_type: entityType,
              p_memory_type: 'conclusion',
              p_content: analysis.executiveSummary,
              p_relevance_score: analysis.confidenceLevel === 'high' ? 1.0 : 0.7,
              p_source_execution_id: executionRecord?.id || null,
              p_expires_in_days: 90,
              p_created_by: userId
            }
          );
          
          if (storeError) {
            console.log('[Orchestrator] store_entity_memory not available, using direct insert');
            await supabase
              .from('ai_agent_memory')
              .insert({
                workspace_id: workspaceId,
                entity_id: entityId,
                entity_type: entityType,
                memory_type: 'conclusion',
                memory_category: 'general',
                content: analysis.executiveSummary.substring(0, 2000),
                relevance_score: analysis.confidenceLevel === 'high' ? 1.0 : 0.7,
                source_execution_id: executionRecord?.id,
                source_type: 'agent_conclusion',
                expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
                created_by: userId,
              });
          }
          
          if (analysis.riskIndicators.length > 0) {
            const riskContent = `Riscos identificados: ${analysis.riskIndicators.join('; ')}`;
            await supabase
              .from('ai_agent_memory')
              .insert({
                workspace_id: workspaceId,
                entity_id: entityId,
                entity_type: entityType,
                memory_type: 'risk',
                memory_category: 'general',
                content: riskContent.substring(0, 2000),
                relevance_score: 0.8,
                source_execution_id: executionRecord?.id,
                source_type: 'agent_conclusion',
                expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                created_by: userId,
              });
          }
        } catch (memErr) {
          console.error('[Orchestrator] Error storing memory:', memErr);
        }
      }
    }

    const response: AgentResponse = {
      success: true,
      executionId,
      output: analysis,
      reasoningTrace,
      dataSourcesUsed,
      durationMs,
      tokensUsed: cacheResult.fromCache ? 0 : 0,
    };

    // Add cache metadata to response
    const responseWithCache = {
      ...response,
      cache: {
        fromCache: cacheResult.fromCache,
        cacheKey: cacheResult.cacheKey,
        lookupTimeMs: cacheResult.lookupTimeMs,
        tokensSaved: cacheResult.tokensSaved,
      },
    };

    console.log(`[Orchestrator] Completed in ${durationMs}ms, confidence: ${analysis.confidenceLevel}, fromCache: ${cacheResult.fromCache}`);

    return new Response(
      JSON.stringify(responseWithCache),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (e) {
    const error = e as Error;
    console.error('[Orchestrator] Error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        success: false,
        durationMs: Date.now() - startTime,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper: Get table name from entity type
function getTableName(entityType: string): string {
  const mapping: Record<string, string> = {
    lead: 'leads',
    contact: 'contacts',
    company: 'companies',
    opportunity: 'opportunities',
  };
  return mapping[entityType] || entityType;
}

// Check if we should delegate to a specialized agent
function shouldDelegateToSpecializedAgent(agentType: string): boolean {
  // For opportunity and client, we have specialized agents
  // The orchestrator can still handle them, but specialized agents provide deeper analysis
  return agentType === 'opportunity' || agentType === 'client';
}

// Generate analysis based on agent type and data
function generateAgentAnalysis(
  agentType: string,
  entityData: any,
  conversationData: any[],
  previousConclusions: any[],
  context?: Record<string, unknown>
): AgentOutput {
  // This is the fallback rule-based analysis
  // For specialized analysis, the client should call the specialized agent directly
  
  switch (agentType) {
    case 'lead':
      return generateLeadAnalysis(entityData, conversationData, previousConclusions);
    case 'contact':
      return generateContactAnalysis(entityData, conversationData, previousConclusions);
    case 'opportunity':
      // Note: For deep analysis, call ai-agent-opportunity directly
      return generateOpportunityAnalysis(entityData, previousConclusions);
    case 'client':
      // Note: For deep analysis, call ai-agent-client directly
      return generateClientAnalysis(entityData, previousConclusions);
    default:
      return getDefaultAnalysis();
  }
}

function generateLeadAnalysis(lead: any, conversations: any[], memories: any[]): AgentOutput {
  const keySignals: string[] = [];
  const riskIndicators: string[] = [];
  let confidence: 'low' | 'medium' | 'high' = 'medium';
  
  // Analyze lead data
  const hasEmail = !!lead.email;
  const hasPhone = !!lead.phone;
  const hasConversations = conversations.length > 0;
  const temperature = lead.ai_temperature || lead.temperature || 'warm';
  const score = lead.ai_score || lead.score || 50;
  
  // Build signals
  if (hasEmail && hasPhone) keySignals.push('Dados de contacto completos');
  if (hasConversations) keySignals.push(`${conversations.length} conversa(s) ativa(s)`);
  if (temperature === 'hot') keySignals.push('Lead quente - alta intenção');
  if (score > 70) keySignals.push(`Score elevado: ${score}`);
  if (lead.source) keySignals.push(`Origem: ${lead.source}`);
  
  // Build risks
  if (!hasEmail && !hasPhone) riskIndicators.push('Sem dados de contacto');
  if (!hasConversations) riskIndicators.push('Sem histórico de conversação');
  if (temperature === 'cold') riskIndicators.push('Lead frio - baixo interesse');
  if (score < 30) riskIndicators.push('Score baixo');
  
  // Determine last contact
  const lastContact = lead.last_contact_at 
    ? new Date(lead.last_contact_at) 
    : null;
  const daysSinceContact = lastContact 
    ? Math.floor((Date.now() - lastContact.getTime()) / (1000 * 60 * 60 * 24))
    : null;
  
  if (daysSinceContact && daysSinceContact > 7) {
    riskIndicators.push(`${daysSinceContact} dias sem contacto`);
  }
  
  // Determine confidence
  if (keySignals.length >= 3 && riskIndicators.length <= 1) {
    confidence = 'high';
  } else if (riskIndicators.length >= 3) {
    confidence = 'low';
  }
  
  // Generate recommendation
  let recommendedAction = '';
  let recommendedActionType = '';
  
  if (temperature === 'hot' && hasConversations) {
    recommendedAction = 'Lead quente com histórico de conversa. Recomendo agendar chamada ou criar proposta.';
    recommendedActionType = 'create_opportunity';
  } else if (!hasConversations) {
    recommendedAction = 'Iniciar primeira abordagem com template de boas-vindas.';
    recommendedActionType = 'send_template';
  } else if (daysSinceContact && daysSinceContact > 7) {
    recommendedAction = 'Fazer follow-up - já passaram mais de 7 dias desde o último contacto.';
    recommendedActionType = 'schedule_followup';
  } else {
    recommendedAction = 'Continuar a nutrir o lead com conteúdo relevante.';
    recommendedActionType = 'nurture';
  }
  
  return {
    executiveSummary: `${lead.name || 'Lead'} é um lead ${temperature === 'hot' ? 'quente' : temperature === 'warm' ? 'morno' : 'frio'} com score de ${score}. ${keySignals.length > 0 ? 'Pontos positivos: ' + keySignals.slice(0, 2).join(', ') + '.' : ''} ${riskIndicators.length > 0 ? 'Atenção: ' + riskIndicators.slice(0, 2).join(', ') + '.' : ''}`,
    statusAssessment: `Lead em fase de ${lead.status || 'qualificação'}. ${hasConversations ? 'Existe histórico de interação.' : 'Ainda sem interação registada.'}`,
    keySignals,
    riskIndicators,
    recommendedAction,
    recommendedActionType,
    confidenceLevel: confidence,
    score,
    temperature: temperature as 'cold' | 'warm' | 'hot',
  };
}

function generateContactAnalysis(contact: any, conversations: any[], memories: any[]): AgentOutput {
  const keySignals: string[] = [];
  const riskIndicators: string[] = [];
  
  if (contact.email) keySignals.push('Email disponível');
  if (contact.phone) keySignals.push('Telefone disponível');
  if (contact.company_id) keySignals.push('Associado a empresa');
  if (conversations.length > 0) keySignals.push(`${conversations.length} conversa(s)`);
  
  if (!contact.email && !contact.phone) riskIndicators.push('Sem dados de contacto');
  
  return {
    executiveSummary: `${contact.name || 'Contacto'} tem ${keySignals.length} pontos de dados completos. ${contact.job_title ? 'Cargo: ' + contact.job_title + '.' : ''}`,
    statusAssessment: 'Contacto ativo no sistema.',
    keySignals,
    riskIndicators,
    recommendedAction: keySignals.length < 3 
      ? 'Enriquecer dados do contacto com mais informações.' 
      : 'Dados completos. Considerar próxima ação comercial.',
    recommendedActionType: keySignals.length < 3 ? 'enrich_data' : 'schedule_outreach',
    confidenceLevel: keySignals.length >= 3 ? 'high' : 'medium',
  };
}

function generateOpportunityAnalysis(opportunity: any, memories: any[]): AgentOutput {
  const keySignals: string[] = [];
  const riskIndicators: string[] = [];
  
  const value = opportunity.value || 0;
  const probability = opportunity.probability || 50;
  const expectedValue = value * (probability / 100);
  
  if (value > 0) keySignals.push(`Valor: €${value.toLocaleString()}`);
  if (probability >= 70) keySignals.push('Alta probabilidade de fecho');
  if (opportunity.expected_close_date) keySignals.push('Data de fecho definida');
  
  if (probability < 30) riskIndicators.push('Baixa probabilidade');
  if (!opportunity.expected_close_date) riskIndicators.push('Sem data de fecho prevista');
  
  // Check for stagnation
  const updatedAt = opportunity.updated_at ? new Date(opportunity.updated_at) : null;
  const daysSinceUpdate = updatedAt 
    ? Math.floor((Date.now() - updatedAt.getTime()) / (1000 * 60 * 60 * 24))
    : null;
  
  if (daysSinceUpdate && daysSinceUpdate > 14) {
    riskIndicators.push(`Estagnada há ${daysSinceUpdate} dias`);
  }
  
  let recommendedAction = '';
  let recommendedActionType = '';
  
  if (probability >= 70) {
    recommendedAction = 'Oportunidade com alta probabilidade. Enviar proposta final ou agendar reunião de fecho.';
    recommendedActionType = 'send_proposal';
  } else if (daysSinceUpdate && daysSinceUpdate > 14) {
    recommendedAction = 'Oportunidade estagnada. Fazer follow-up urgente para reativar.';
    recommendedActionType = 'follow_up_urgently';
  } else {
    recommendedAction = 'Continuar a desenvolver a oportunidade. Identificar próximos passos.';
    recommendedActionType = 'schedule_meeting';
  }
  
  return {
    executiveSummary: `${opportunity.title || 'Oportunidade'} com valor potencial de €${value.toLocaleString()} e ${probability}% de probabilidade. Valor esperado: €${expectedValue.toLocaleString()}.`,
    statusAssessment: `Oportunidade em fase "${opportunity.status || 'aberta'}". ${daysSinceUpdate ? `Última atualização há ${daysSinceUpdate} dias.` : ''}`,
    keySignals,
    riskIndicators,
    recommendedAction,
    recommendedActionType,
    confidenceLevel: probability >= 70 ? 'high' : probability >= 40 ? 'medium' : 'low',
    score: probability,
  };
}

function generateClientAnalysis(client: any, memories: any[]): AgentOutput {
  const keySignals: string[] = [];
  const riskIndicators: string[] = [];
  
  // Client health indicators
  if (client.last_contact_at) {
    const daysSince = Math.floor((Date.now() - new Date(client.last_contact_at).getTime()) / (1000 * 60 * 60 * 24));
    if (daysSince < 30) {
      keySignals.push('Contacto recente');
    } else if (daysSince > 60) {
      riskIndicators.push(`${daysSince} dias sem contacto`);
    }
  }
  
  return {
    executiveSummary: `Cliente ${client.name || 'sem nome'} com ${keySignals.length} indicadores positivos e ${riskIndicators.length} alertas.`,
    statusAssessment: 'Cliente ativo no sistema.',
    keySignals,
    riskIndicators,
    recommendedAction: riskIndicators.length > 0 
      ? 'Verificar satisfação do cliente e considerar outreach de retenção.' 
      : 'Cliente saudável. Considerar oportunidades de upsell.',
    recommendedActionType: riskIndicators.length > 0 ? 'check_satisfaction' : 'upsell_opportunity',
    confidenceLevel: riskIndicators.length === 0 ? 'high' : 'medium',
  };
}

function getDefaultAnalysis(): AgentOutput {
  return {
    executiveSummary: 'Análise não disponível para este tipo de entidade.',
    statusAssessment: 'Estado desconhecido.',
    keySignals: [],
    riskIndicators: ['Tipo de entidade não suportado'],
    recommendedAction: 'Contactar suporte para assistência.',
    recommendedActionType: 'escalate_issue',
    confidenceLevel: 'low',
  };
}
