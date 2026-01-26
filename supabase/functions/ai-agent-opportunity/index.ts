import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { withCache } from '../_shared/cache-manager.ts';
import type { CacheConfidenceLevel } from '../_shared/cache-types.ts';

/**
 * AI Agent: Opportunity Specialist
 * 
 * Responsibility: Probability & Risk Analysis
 * - Assess closing probability
 * - Identify loss risks
 * - Calculate weighted value
 * - Detect funnel stagnation
 * - Suggest closing tactics
 * - Response caching for repeated analysis
 */

interface OpportunityAgentRequest {
  entityId: string;
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
  probability?: number;
  pipelineHealth?: 'excellent' | 'good' | 'attention' | 'critical';
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
    const body: OpportunityAgentRequest = await req.json();
    const { entityId, workspaceId, triggerType, context } = body;

    if (!entityId || !workspaceId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: entityId, workspaceId' }),
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

    console.log(`[Opportunity Agent] Analyzing opportunity ${entityId}`);

    const dataSourcesUsed: string[] = [];
    const reasoningTrace: ReasoningStep[] = [];

    // Step 1: Fetch opportunity with relationships
    const step1Start = Date.now();
    const { data: opportunity, error: oppError } = await supabase
      .from('opportunities')
      .select(`
        *,
        stage:pipeline_stages(id, name, probability, position),
        contact:contacts(id, name, email, phone, job_title),
        company:companies(id, name, industry, employee_count),
        lead:leads(id, name, email, phone, source, temperature)
      `)
      .eq('id', entityId)
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (oppError || !opportunity) {
      reasoningTrace.push({
        step: 1,
        action: 'Fetch opportunity data',
        input: `opportunity_id: ${entityId}`,
        output: oppError ? `Error: ${oppError.message}` : 'Not found',
        confidence: 0,
        durationMs: Date.now() - step1Start,
        toolUsed: 'get_entity_data',
      });

      return new Response(
        JSON.stringify({ error: 'Opportunity not found', partialAnalysis: true }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    dataSourcesUsed.push('opportunities', 'pipeline_stages');
    if (opportunity.contact) dataSourcesUsed.push('contacts');
    if (opportunity.company) dataSourcesUsed.push('companies');
    if (opportunity.lead) dataSourcesUsed.push('leads');

    reasoningTrace.push({
      step: 1,
      action: 'Fetch opportunity data',
      input: `opportunity_id: ${entityId}`,
      output: `Found: ${opportunity.title}, value: €${opportunity.value || 0}`,
      confidence: 1.0,
      durationMs: Date.now() - step1Start,
      toolUsed: 'get_entity_data',
    });

    // Step 2: Fetch activities and calculate engagement
    const step2Start = Date.now();
    const { data: activities } = await supabase
      .from('crm_activities')
      .select('id, activity_type, created_at')
      .eq('opportunity_id', entityId)
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
      step: 2,
      action: 'Analyze activity history',
      input: `opportunity_id: ${entityId}`,
      output: `${activityCount} activities, last: ${daysSinceActivity ?? 'N/A'} days ago`,
      confidence: activityCount > 0 ? 0.9 : 0.5,
      durationMs: Date.now() - step2Start,
      toolUsed: 'get_activity_timeline',
    });

    // Step 3: Fetch pipeline context
    const step3Start = Date.now();
    const { data: pipelineStages } = await supabase
      .from('pipeline_stages')
      .select('id, name, position, probability')
      .eq('workspace_id', workspaceId)
      .order('position', { ascending: true });

    const currentStagePosition = opportunity.stage?.position || 0;
    const totalStages = pipelineStages?.length || 5;
    const progressPercent = Math.round((currentStagePosition / totalStages) * 100);

    reasoningTrace.push({
      step: 3,
      action: 'Get pipeline context',
      input: `stage_id: ${opportunity.stage_id}`,
      output: `Stage ${currentStagePosition}/${totalStages} (${progressPercent}% progress)`,
      confidence: 0.9,
      durationMs: Date.now() - step3Start,
      toolUsed: 'get_pipeline_context',
    });

    // Step 4: Calculate time metrics
    const step4Start = Date.now();
    const createdAt = new Date(opportunity.created_at);
    const daysInFunnel = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
    const expectedCloseDate = opportunity.expected_close_date 
      ? new Date(opportunity.expected_close_date) 
      : null;
    const daysUntilClose = expectedCloseDate
      ? Math.floor((expectedCloseDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null;

    reasoningTrace.push({
      step: 4,
      action: 'Calculate time metrics',
      input: `created: ${opportunity.created_at}`,
      output: `${daysInFunnel} days in funnel, ${daysUntilClose ?? 'N/A'} days until expected close`,
      confidence: 1.0,
      durationMs: Date.now() - step4Start,
      toolUsed: 'calculate_score',
    });

    // Step 5: Generate analysis with cache layer
    const step5Start = Date.now();
    
    // Use cache layer for analysis
    const cacheResult = await withCache(
      supabase,
      {
        workspaceId,
        agentType: 'opportunity',
        entityId,
        entityType: 'opportunity',
        entityData: opportunity,
        triggerType,
      },
      async () => {
        const analysis = generateOpportunityAnalysis(
          opportunity,
          {
            activityCount,
            daysSinceActivity,
            daysInFunnel,
            daysUntilClose,
            progressPercent,
            totalStages,
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
      action: cacheResult.fromCache ? 'Retrieved from cache' : 'Generate risk/probability analysis',
      input: `All data sources: ${dataSourcesUsed.join(', ')}`,
      output: cacheResult.fromCache 
        ? `Cache HIT (${cacheResult.lookupTimeMs}ms)`
        : `Confidence: ${analysis.confidenceLevel}, ${analysis.keySignals.length} signals, ${analysis.riskIndicators.length} risks`,
      confidence: analysis.confidenceLevel === 'high' ? 0.9 : analysis.confidenceLevel === 'medium' ? 0.7 : 0.5,
      durationMs: cacheResult.fromCache ? cacheResult.lookupTimeMs : Date.now() - step5Start,
      toolUsed: cacheResult.fromCache ? 'cache_lookup' : 'calculate_score',
    });

    const durationMs = Date.now() - startTime;

    // Only record execution and store memory if NOT from cache
    let executionId = 'cached';
    
    if (!cacheResult.fromCache) {
      // Record execution in audit trail
      const { data: executionRecord } = await supabase
        .from('ai_agent_executions')
        .insert({
          workspace_id: workspaceId,
          agent_type: 'opportunity',
          entity_id: entityId,
          entity_type: 'opportunity',
          trigger_type: triggerType,
          input_summary: {
            title: opportunity.title,
            value: opportunity.value,
            stage: opportunity.stage?.name,
            daysInFunnel,
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
              p_entity_type: 'opportunity',
              p_memory_type: 'conclusion',
              p_content: analysis.executiveSummary,
              p_relevance_score: analysis.confidenceLevel === 'high' ? 1.0 : 0.7,
              p_source_execution_id: executionRecord?.id || null,
              p_expires_in_days: 30,
              p_created_by: userId
            }
          );
          
          if (storeError) {
            console.log('[Opportunity Agent] store_entity_memory not available, using direct insert');
            await supabase
              .from('ai_agent_memory')
              .insert({
                workspace_id: workspaceId,
                entity_id: entityId,
                entity_type: 'opportunity',
                memory_type: 'conclusion',
                memory_category: 'general',
                content: analysis.executiveSummary.substring(0, 2000),
                relevance_score: analysis.confidenceLevel === 'high' ? 1.0 : 0.7,
                source_execution_id: executionRecord?.id,
                source_type: 'agent_conclusion',
                expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                created_by: userId,
              });
          }
          
          if (analysis.pipelineHealth === 'critical' || analysis.pipelineHealth === 'attention') {
            await supabase
              .from('ai_agent_memory')
              .insert({
                workspace_id: workspaceId,
                entity_id: entityId,
                entity_type: 'opportunity',
                memory_type: 'pattern',
                memory_category: 'timeline',
                content: `Pipeline health: ${analysis.pipelineHealth}. ${analysis.riskIndicators.join('; ')}`,
                relevance_score: 0.9,
                source_execution_id: executionRecord?.id,
                source_type: 'agent_conclusion',
                expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
                created_by: userId,
              });
          }
          
          if (analysis.riskIndicators.length > 0) {
            await supabase
              .from('ai_agent_memory')
              .insert({
                workspace_id: workspaceId,
                entity_id: entityId,
                entity_type: 'opportunity',
                memory_type: 'risk',
                memory_category: 'general',
                content: `Riscos: ${analysis.riskIndicators.join('; ')}`,
                relevance_score: 0.85,
                source_execution_id: executionRecord?.id,
                source_type: 'agent_conclusion',
                expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                created_by: userId,
              });
          }
        } catch (memErr) {
          console.error('[Opportunity Agent] Error storing memory:', memErr);
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

    console.log(`[Opportunity Agent] Completed in ${durationMs}ms, fromCache: ${cacheResult.fromCache}`);

    return new Response(
      JSON.stringify(responseWithCache),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (e) {
    const error = e as Error;
    console.error('[Opportunity Agent] Error:', error);
    
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

interface OpportunityMetrics {
  activityCount: number;
  daysSinceActivity: number | null;
  daysInFunnel: number;
  daysUntilClose: number | null;
  progressPercent: number;
  totalStages: number;
}

function generateOpportunityAnalysis(
  opportunity: any,
  metrics: OpportunityMetrics
): AgentOutput {
  const keySignals: string[] = [];
  const riskIndicators: string[] = [];
  
  const value = opportunity.value || 0;
  const probability = opportunity.probability || opportunity.stage?.probability || 50;
  const weightedValue = (value * probability) / 100;
  const status = opportunity.status || 'open';

  // Analyze positive signals
  if (value > 0) keySignals.push(`Valor: €${value.toLocaleString()}`);
  if (probability >= 70) keySignals.push(`Alta probabilidade: ${probability}%`);
  if (metrics.activityCount >= 5) keySignals.push(`Boa atividade: ${metrics.activityCount} interações`);
  if (metrics.progressPercent >= 60) keySignals.push(`Avançado no funil: ${metrics.progressPercent}%`);
  if (opportunity.contact?.name) keySignals.push(`Contacto identificado: ${opportunity.contact.name}`);
  if (opportunity.company?.name) keySignals.push(`Empresa: ${opportunity.company.name}`);
  if (opportunity.expected_close_date && metrics.daysUntilClose && metrics.daysUntilClose > 0) {
    keySignals.push(`Fecho previsto em ${metrics.daysUntilClose} dias`);
  }

  // Analyze risks
  if (metrics.daysSinceActivity !== null && metrics.daysSinceActivity > 7) {
    riskIndicators.push(`${metrics.daysSinceActivity} dias sem atividade`);
  }
  if (metrics.daysInFunnel > 30 && metrics.progressPercent < 50) {
    riskIndicators.push(`Estagnação: ${metrics.daysInFunnel} dias no funil`);
  }
  if (probability < 30) {
    riskIndicators.push(`Baixa probabilidade: ${probability}%`);
  }
  if (value > 10000 && metrics.activityCount < 3) {
    riskIndicators.push('Alto valor com pouca atividade');
  }
  if (metrics.daysUntilClose !== null && metrics.daysUntilClose < 0) {
    riskIndicators.push('Data de fecho já passou');
  }
  if (!opportunity.contact && !opportunity.lead) {
    riskIndicators.push('Sem contacto associado');
  }

  // Determine confidence
  let confidence: 'low' | 'medium' | 'high' = 'medium';
  if (keySignals.length >= 4 && riskIndicators.length <= 1) {
    confidence = 'high';
  } else if (riskIndicators.length >= 3 || probability < 20) {
    confidence = 'low';
  }

  // Determine pipeline health
  let pipelineHealth: 'excellent' | 'good' | 'attention' | 'critical' = 'good';
  if (probability >= 70 && riskIndicators.length === 0) {
    pipelineHealth = 'excellent';
  } else if (riskIndicators.length >= 3) {
    pipelineHealth = 'critical';
  } else if (riskIndicators.length >= 2) {
    pipelineHealth = 'attention';
  }

  // Generate recommendation
  let recommendedAction = '';
  let recommendedActionType = '';

  if (status === 'won' || status === 'lost') {
    recommendedAction = `Oportunidade ${status === 'won' ? 'ganha' : 'perdida'}. Nenhuma ação necessária.`;
    recommendedActionType = 'none';
  } else if (metrics.daysUntilClose !== null && metrics.daysUntilClose < 0) {
    recommendedAction = 'Data de fecho já passou. Atualiza a data ou marca como perdida.';
    recommendedActionType = 'update_probability';
  } else if (metrics.daysSinceActivity !== null && metrics.daysSinceActivity > 7) {
    recommendedAction = 'Fazer follow-up urgente - oportunidade está a esfriar.';
    recommendedActionType = 'follow_up_urgently';
  } else if (probability >= 70 && metrics.progressPercent >= 60) {
    recommendedAction = 'Oportunidade pronta para proposta. Enviar proposta comercial.';
    recommendedActionType = 'send_proposal';
  } else if (metrics.activityCount < 3 && metrics.daysInFunnel > 14) {
    recommendedAction = 'Agendar reunião para qualificar melhor a oportunidade.';
    recommendedActionType = 'schedule_meeting';
  } else if (!opportunity.contact && opportunity.company) {
    recommendedAction = 'Identificar e adicionar contacto decisor.';
    recommendedActionType = 'add_stakeholder';
  } else {
    recommendedAction = 'Continuar a nutrir a oportunidade com touchpoints regulares.';
    recommendedActionType = 'schedule_meeting';
  }

  // Generate executive summary
  const stageName = opportunity.stage?.name || 'N/A';
  const summaryParts: string[] = [];
  
  summaryParts.push(`"${opportunity.title}" está na fase "${stageName}" com valor de €${value.toLocaleString()} (${probability}% probabilidade).`);
  
  if (pipelineHealth === 'excellent') {
    summaryParts.push('Excelente progressão - pronta para avançar.');
  } else if (pipelineHealth === 'critical') {
    summaryParts.push('Atenção urgente necessária - múltiplos riscos identificados.');
  } else if (riskIndicators.length > 0) {
    summaryParts.push(`Atenção: ${riskIndicators[0]}.`);
  }

  return {
    executiveSummary: summaryParts.join(' '),
    statusAssessment: `Fase: ${stageName} | ${metrics.daysInFunnel} dias no funil | Valor ponderado: €${Math.round(weightedValue).toLocaleString()}`,
    keySignals,
    riskIndicators,
    recommendedAction,
    recommendedActionType,
    confidenceLevel: confidence,
    score: probability,
    probability,
    pipelineHealth,
  };
}
