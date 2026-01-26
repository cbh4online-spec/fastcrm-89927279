import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { withCache } from '../_shared/cache-manager.ts';
import type { CacheConfidenceLevel } from '../_shared/cache-types.ts';

/**
 * AI Agent: Client Specialist
 * 
 * Responsibility: Health & Retention
 * - Calculate health score
 * - Detect churn signals
 * - Identify upsell opportunities
 * - Monitor satisfaction
 * - Suggest retention actions
 * - Response caching for cost optimization
 */

interface ClientAgentRequest {
  entityId: string;
  entityType: 'contact' | 'company';
  workspaceId: string;
  triggerType: 'manual' | 'entity_created' | 'status_changed' | 'time_based';
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
  healthScore?: number;
  lifetimeValue?: number;
  churnRisk?: 'low' | 'medium' | 'high';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getUser(token);
    
    if (claimsError || !claimsData?.user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.user.id;
    const body: ClientAgentRequest = await req.json();
    const { entityId, entityType, workspaceId, triggerType } = body;

    if (!entityId || !entityType || !workspaceId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: entityId, entityType, workspaceId' }),
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

    console.log(`[Client Agent] Analyzing ${entityType} ${entityId}`);

    const dataSourcesUsed: string[] = [];
    const reasoningTrace: ReasoningStep[] = [];

    // Step 1: Fetch entity data
    const step1Start = Date.now();
    const tableName = entityType === 'contact' ? 'contacts' : 'companies';
    
    const { data: entity, error: entityError } = await supabase
      .from(tableName)
      .select('*')
      .eq('id', entityId)
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (entityError || !entity) {
      reasoningTrace.push({
        step: 1,
        action: 'Fetch entity data',
        input: `${entityType}_id: ${entityId}`,
        output: entityError ? `Error: ${entityError.message}` : 'Not found',
        confidence: 0,
        durationMs: Date.now() - step1Start,
        toolUsed: 'get_entity_data',
      });

      return new Response(
        JSON.stringify({ error: 'Entity not found', partialAnalysis: true }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    dataSourcesUsed.push(tableName);
    reasoningTrace.push({
      step: 1,
      action: 'Fetch entity data',
      input: `${entityType}_id: ${entityId}`,
      output: `Found: ${entity.name}`,
      confidence: 1.0,
      durationMs: Date.now() - step1Start,
      toolUsed: 'get_entity_data',
    });

    // Step 2: Fetch won opportunities (proof of being a client)
    const step2Start = Date.now();
    const oppQuery = entityType === 'contact'
      ? supabase.from('opportunities').select('id, title, value, closed_at, status').eq('contact_id', entityId).eq('status', 'won')
      : supabase.from('opportunities').select('id, title, value, closed_at, status').eq('company_id', entityId).eq('status', 'won');
    
    const { data: wonOpportunities } = await oppQuery
      .eq('workspace_id', workspaceId)
      .order('closed_at', { ascending: false });

    const wonCount = wonOpportunities?.length || 0;
    const lifetimeValue = wonOpportunities?.reduce((sum, opp) => sum + (opp.value || 0), 0) || 0;
    const lastPurchase = wonOpportunities?.[0]?.closed_at 
      ? new Date(wonOpportunities[0].closed_at) 
      : null;
    const daysSincePurchase = lastPurchase
      ? Math.floor((Date.now() - lastPurchase.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    if (wonCount > 0) dataSourcesUsed.push('opportunities');

    reasoningTrace.push({
      step: 2,
      action: 'Analyze purchase history',
      input: `${entityType}_id: ${entityId}`,
      output: `${wonCount} won opportunities, LTV: €${lifetimeValue.toLocaleString()}, last purchase: ${daysSincePurchase ?? 'N/A'} days ago`,
      confidence: wonCount > 0 ? 0.9 : 0.3,
      durationMs: Date.now() - step2Start,
      toolUsed: 'get_entity_data',
    });

    // Step 3: Fetch recent interactions
    const step3Start = Date.now();
    const { data: activities } = await supabase
      .from('crm_activities')
      .select('id, activity_type, created_at, title')
      .eq(entityType === 'contact' ? 'contact_id' : 'company_id', entityId)
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(20);

    const activityCount = activities?.length || 0;
    const lastActivity = activities?.[0]?.created_at
      ? new Date(activities[0].created_at)
      : null;
    const daysSinceActivity = lastActivity
      ? Math.floor((Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    if (activityCount > 0) dataSourcesUsed.push('crm_activities');

    reasoningTrace.push({
      step: 3,
      action: 'Analyze interaction history',
      input: `${entityType}_id: ${entityId}`,
      output: `${activityCount} activities, last: ${daysSinceActivity ?? 'N/A'} days ago`,
      confidence: activityCount > 0 ? 0.8 : 0.5,
      durationMs: Date.now() - step3Start,
      toolUsed: 'get_activity_timeline',
    });

    // Step 4: Fetch open opportunities (upsell potential)
    const step4Start = Date.now();
    const openOppQuery = entityType === 'contact'
      ? supabase.from('opportunities').select('id, title, value, probability').eq('contact_id', entityId).eq('status', 'open')
      : supabase.from('opportunities').select('id, title, value, probability').eq('company_id', entityId).eq('status', 'open');
    
    const { data: openOpportunities } = await openOppQuery.eq('workspace_id', workspaceId);
    
    const openOppCount = openOpportunities?.length || 0;
    const pipelineValue = openOpportunities?.reduce((sum, opp) => sum + (opp.value || 0), 0) || 0;

    reasoningTrace.push({
      step: 4,
      action: 'Identify upsell opportunities',
      input: `${entityType}_id: ${entityId}`,
      output: `${openOppCount} open opportunities, pipeline: €${pipelineValue.toLocaleString()}`,
      confidence: 0.9,
      durationMs: Date.now() - step4Start,
      toolUsed: 'get_entity_data',
    });

    // Step 5: Generate analysis with cache layer
    const step5Start = Date.now();
    
    // Use cache layer for analysis
    const cacheResult = await withCache(
      supabase,
      {
        workspaceId,
        agentType: 'client',
        entityId,
        entityType,
        entityData: entity,
        triggerType,
      },
      async () => {
        const analysis = generateClientAnalysis(
          entity,
          entityType,
          {
            wonCount,
            lifetimeValue,
            daysSincePurchase,
            activityCount,
            daysSinceActivity,
            openOppCount,
            pipelineValue,
          }
        );
        
        return {
          response: analysis,
          confidenceLevel: analysis.confidenceLevel as CacheConfidenceLevel,
          durationMs: Date.now() - step5Start,
          tokensUsed: 0,
        };
      }
    );
    
    const analysis = cacheResult.response;

    reasoningTrace.push({
      step: 5,
      action: cacheResult.fromCache ? 'Retrieved from cache' : 'Generate health & retention analysis',
      input: `All data sources: ${dataSourcesUsed.join(', ')}`,
      output: cacheResult.fromCache 
        ? `Cache HIT (${cacheResult.lookupTimeMs}ms)`
        : `Health: ${analysis.healthScore}/100, Churn risk: ${analysis.churnRisk}, ${analysis.keySignals.length} signals`,
      confidence: analysis.confidenceLevel === 'high' ? 0.9 : analysis.confidenceLevel === 'medium' ? 0.7 : 0.5,
      durationMs: cacheResult.fromCache ? cacheResult.lookupTimeMs : Date.now() - step5Start,
      toolUsed: cacheResult.fromCache ? 'cache_lookup' : 'calculate_score',
    });

    const durationMs = Date.now() - startTime;

    // Only record execution and store memory if NOT from cache
    let executionId = 'cached';
    
    if (!cacheResult.fromCache) {
      // Record execution
      const { data: executionRecord } = await supabase
        .from('ai_agent_executions')
        .insert({
          workspace_id: workspaceId,
          agent_type: 'client',
          entity_id: entityId,
          entity_type: entityType,
          trigger_type: triggerType,
          input_summary: {
            name: entity.name,
            wonCount,
            lifetimeValue,
            activityCount,
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
      
      executionId = executionRecord?.id || 'unknown';

      // Store conclusion in memory
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
              p_expires_in_days: 60,
              p_created_by: userId
            }
          );
          
          if (storeError) {
            console.log('[Client Agent] store_entity_memory not available, using direct insert');
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
                expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
                created_by: userId,
              });
          }
          
          if (analysis.churnRisk && analysis.churnRisk !== 'low') {
            await supabase
              .from('ai_agent_memory')
              .insert({
                workspace_id: workspaceId,
                entity_id: entityId,
                entity_type: entityType,
                memory_type: 'risk',
                memory_category: 'relationship',
                content: `Churn risk: ${analysis.churnRisk}. Health score: ${analysis.healthScore}/100. ${analysis.riskIndicators.join('; ')}`,
                relevance_score: analysis.churnRisk === 'high' ? 1.0 : 0.8,
                source_execution_id: executionRecord?.id,
                source_type: 'agent_conclusion',
                expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                created_by: userId,
              });
          }
          
          if (analysis.lifetimeValue && analysis.lifetimeValue > 0) {
            await supabase
              .from('ai_agent_memory')
              .insert({
                workspace_id: workspaceId,
                entity_id: entityId,
                entity_type: entityType,
                memory_type: 'fact',
                memory_category: 'price_sensitivity',
                content: `Lifetime Value: €${analysis.lifetimeValue.toLocaleString()}. Cliente desde análise inicial.`,
                relevance_score: 0.9,
                source_execution_id: executionRecord?.id,
                source_type: 'agent_conclusion',
                expires_at: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
                created_by: userId,
              });
          }
        } catch (memErr) {
          console.error('[Client Agent] Error storing memory:', memErr);
        }
      }
    }

    const responseWithCache = {
      success: true,
      executionId,
      output: analysis,
      reasoningTrace,
      dataSourcesUsed,
      durationMs,
      tokensUsed: 0,
      cache: {
        fromCache: cacheResult.fromCache,
        cacheKey: cacheResult.cacheKey,
        lookupTimeMs: cacheResult.lookupTimeMs,
        tokensSaved: cacheResult.tokensSaved,
      },
    };

    console.log(`[Client Agent] Completed in ${durationMs}ms, fromCache: ${cacheResult.fromCache}`);

    return new Response(
      JSON.stringify(responseWithCache),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (e) {
    const error = e as Error;
    console.error('[Client Agent] Error:', error);
    
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

interface ClientMetrics {
  wonCount: number;
  lifetimeValue: number;
  daysSincePurchase: number | null;
  activityCount: number;
  daysSinceActivity: number | null;
  openOppCount: number;
  pipelineValue: number;
}

function generateClientAnalysis(
  entity: any,
  entityType: string,
  metrics: ClientMetrics
): AgentOutput {
  const keySignals: string[] = [];
  const riskIndicators: string[] = [];
  
  const isClient = metrics.wonCount > 0;

  // Calculate health score (0-100)
  let healthScore = 50; // Base score

  // Positive factors
  if (isClient) {
    healthScore += 15;
    keySignals.push(`Cliente com ${metrics.wonCount} compra(s)`);
  }
  if (metrics.lifetimeValue > 0) {
    keySignals.push(`LTV: €${metrics.lifetimeValue.toLocaleString()}`);
    if (metrics.lifetimeValue > 5000) healthScore += 10;
    if (metrics.lifetimeValue > 20000) healthScore += 10;
  }
  if (metrics.activityCount >= 5) {
    healthScore += 10;
    keySignals.push(`Boa interação: ${metrics.activityCount} atividades`);
  }
  if (metrics.daysSinceActivity !== null && metrics.daysSinceActivity < 14) {
    healthScore += 10;
    keySignals.push('Interação recente');
  }
  if (metrics.openOppCount > 0) {
    healthScore += 5;
    keySignals.push(`${metrics.openOppCount} oportunidade(s) em pipeline`);
  }

  // Negative factors (churn signals)
  if (metrics.daysSinceActivity !== null && metrics.daysSinceActivity > 30) {
    healthScore -= 15;
    riskIndicators.push(`${metrics.daysSinceActivity} dias sem interação`);
  }
  if (metrics.daysSincePurchase !== null && metrics.daysSincePurchase > 180) {
    healthScore -= 10;
    riskIndicators.push(`${metrics.daysSincePurchase} dias desde última compra`);
  }
  if (metrics.activityCount === 0) {
    healthScore -= 10;
    riskIndicators.push('Sem histórico de interação');
  }
  if (!isClient && metrics.openOppCount === 0) {
    healthScore -= 15;
    riskIndicators.push('Sem compras e sem oportunidades');
  }

  // Clamp health score
  healthScore = Math.max(0, Math.min(100, healthScore));

  // Determine churn risk
  let churnRisk: 'low' | 'medium' | 'high' = 'low';
  if (healthScore < 40) {
    churnRisk = 'high';
  } else if (healthScore < 60) {
    churnRisk = 'medium';
  }

  // Determine confidence
  let confidence: 'low' | 'medium' | 'high' = 'medium';
  if (isClient && metrics.activityCount >= 3) {
    confidence = 'high';
  } else if (!isClient && metrics.activityCount < 2) {
    confidence = 'low';
  }

  // Generate recommendation
  let recommendedAction = '';
  let recommendedActionType = '';

  if (!isClient) {
    if (metrics.openOppCount > 0) {
      recommendedAction = 'Converter oportunidades abertas para tornar cliente.';
      recommendedActionType = 'upsell_opportunity';
    } else {
      recommendedAction = 'Ainda não é cliente. Iniciar processo de qualificação.';
      recommendedActionType = 'retention_outreach';
    }
  } else if (churnRisk === 'high') {
    recommendedAction = 'Risco de churn elevado! Agendar chamada de retenção urgente.';
    recommendedActionType = 'retention_outreach';
  } else if (metrics.daysSinceActivity !== null && metrics.daysSinceActivity > 30) {
    recommendedAction = 'Cliente inativo. Fazer check-in de satisfação.';
    recommendedActionType = 'check_satisfaction';
  } else if (metrics.daysSincePurchase !== null && metrics.daysSincePurchase > 90 && metrics.openOppCount === 0) {
    recommendedAction = 'Oportunidade de upsell - cliente satisfeito sem nova compra há 3+ meses.';
    recommendedActionType = 'upsell_opportunity';
  } else if (metrics.lifetimeValue > 10000 && metrics.openOppCount === 0) {
    recommendedAction = 'Cliente de alto valor. Agendar reunião de revisão estratégica.';
    recommendedActionType = 'schedule_review';
  } else {
    recommendedAction = 'Cliente saudável. Manter touchpoints regulares.';
    recommendedActionType = 'check_satisfaction';
  }

  // Generate executive summary
  const entityLabel = entityType === 'contact' ? 'Contacto' : 'Empresa';
  const summaryParts: string[] = [];

  if (isClient) {
    summaryParts.push(`${entity.name} é cliente com LTV de €${metrics.lifetimeValue.toLocaleString()} em ${metrics.wonCount} compra(s).`);
    if (churnRisk === 'high') {
      summaryParts.push('ATENÇÃO: Risco de churn elevado - ação de retenção necessária.');
    } else if (churnRisk === 'medium') {
      summaryParts.push('Risco moderado de inatividade - recomendado follow-up.');
    } else {
      summaryParts.push('Saúde do cliente boa.');
    }
  } else {
    summaryParts.push(`${entity.name} ainda não é cliente.`);
    if (metrics.openOppCount > 0) {
      summaryParts.push(`${metrics.openOppCount} oportunidade(s) em pipeline com €${metrics.pipelineValue.toLocaleString()} potencial.`);
    }
  }

  return {
    executiveSummary: summaryParts.join(' '),
    statusAssessment: `${entityLabel} | Health Score: ${healthScore}/100 | Risco de churn: ${churnRisk === 'low' ? 'Baixo' : churnRisk === 'medium' ? 'Médio' : 'Alto'}`,
    keySignals,
    riskIndicators,
    recommendedAction,
    recommendedActionType,
    confidenceLevel: confidence,
    score: healthScore,
    healthScore,
    lifetimeValue: metrics.lifetimeValue,
    churnRisk,
  };
}
