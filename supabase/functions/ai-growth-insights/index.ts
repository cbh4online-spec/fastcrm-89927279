import { logAIUsage } from '../_shared/ai-instrumentation.ts';
import { aiGate } from '../_shared/ai-gate.ts';
import { loadBusinessContext } from '../_shared/business-context-loader.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface IMORequest {
  workspace_id: string;
  analysis_type: 'market' | 'growth' | 'both';
  force_refresh?: boolean;
  period_days?: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const {
      workspace_id,
      analysis_type = 'both',
      force_refresh = false,
      period_days = 90,
    }: IMORequest = await req.json();

    if (!workspace_id) {
      return new Response(JSON.stringify({ error: 'workspace_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // AI Gate
    const gate = await aiGate(workspace_id, 'heavy', 'ai-growth-insights');
    if (!gate.allowed) {
      return new Response(JSON.stringify({ error: 'quota_exceeded', upgrade_required: true }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    // Load business context for richer prompts
    const bizContext = await loadBusinessContext(workspace_id);

    const results: { market?: unknown; growth?: unknown } = {};

    // ── MARKET INTELLIGENCE ──────────────────────────────────
    if (analysis_type === 'market' || analysis_type === 'both') {
      if (!force_refresh) {
        const { data: cached } = await supabase
          .from('imo_market_insights')
          .select('*')
          .eq('workspace_id', workspace_id)
          .eq('is_stale', false)
          .gt('expires_at', new Date().toISOString())
          .order('generated_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (cached) results.market = cached;
      }
      if (!results.market) {
        results.market = await generateMarketInsights(supabase, LOVABLE_API_KEY, workspace_id, period_days, bizContext.systemPrompt);
      }
    }

    // ── GROWTH INSIGHTS ──────────────────────────────────────
    if (analysis_type === 'growth' || analysis_type === 'both') {
      if (!force_refresh) {
        const { data: cached } = await supabase
          .from('imo_growth_insights')
          .select('*')
          .eq('workspace_id', workspace_id)
          .eq('is_stale', false)
          .gt('expires_at', new Date().toISOString())
          .order('generated_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (cached) results.growth = cached;
      }
      if (!results.growth) {
        results.growth = await generateGrowthInsights(supabase, LOVABLE_API_KEY, workspace_id, period_days, bizContext.systemPrompt);
      }
    }

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[IMO-AI] ERROR', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// ── Lovable AI call helper ────────────────────────────────────────────────
async function callAI(apiKey: string, system: string, user: string, toolSchema: any) {
  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-3-flash-preview',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      tools: [{ type: 'function', function: toolSchema }],
      tool_choice: { type: 'function', function: { name: toolSchema.name } },
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const t = await response.text();
    console.error('[IMO-AI] Gateway error', response.status, t);
    throw new Error(`AI gateway error ${response.status}`);
  }

  const data = await response.json()

    // AI Usage Instrumentation
    try {
      const _usage = data?.usage;
      logAIUsage({
        workspace_id: workspace_id,
        feature: 'ai-growth-insights',
        model: data?.model || 'google/gemini-3-flash-preview',
        tokens_input: _usage?.prompt_tokens ?? 0,
        tokens_output: _usage?.completion_tokens ?? 0,
        request_type: 'completion',
        latency_ms: Date.now() - (_startTime ?? Date.now()),
      });
    } catch (_e) { /* instrumentation error - non-blocking */ };
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (toolCall?.function?.arguments) {
    return JSON.parse(toolCall.function.arguments);
  }
  // Fallback: try content
  const content = data.choices?.[0]?.message?.content || '{}';
  return JSON.parse(content.replace(/```json|```/g, '').trim());
}

// ── Market Intelligence Generator ──────────────────────────────────────────
async function generateMarketInsights(
  supabase: any,
  apiKey: string,
  workspaceId: string,
  periodDays: number,
  bizContextPrompt: string,
) {
  const cutoffDate = new Date(Date.now() - periodDays * 86400000).toISOString();
  const periodStart = cutoffDate.split('T')[0];
  const periodEnd = new Date().toISOString().split('T')[0];

  const [contacts, companies, leads, opportunities, wonDeals, lostDeals] = await Promise.all([
    supabase.from('contacts').select('company, tags, created_at, source').eq('workspace_id', workspaceId).gte('created_at', cutoffDate).limit(300),
    supabase.from('companies').select('name, industry, size, tags, created_at').eq('workspace_id', workspaceId).limit(200),
    supabase.from('leads').select('source, status, score, tags, created_at, company').eq('workspace_id', workspaceId).gte('created_at', cutoffDate).limit(300),
    supabase.from('opportunities').select('stage_id, value, source, status, close_date, created_at').eq('workspace_id', workspaceId).eq('status', 'active').limit(200),
    supabase.from('opportunities').select('value, source, stage_id').eq('workspace_id', workspaceId).eq('status', 'won').gte('created_at', cutoffDate).limit(100),
    supabase.from('opportunities').select('value, source, stage_id').eq('workspace_id', workspaceId).eq('status', 'lost').gte('created_at', cutoffDate).limit(100),
  ]);

  // Sector distribution
  const sectorCounts: Record<string, number> = {};
  const allTags = [
    ...(contacts.data ?? []).flatMap((c: any) => c.tags ?? []),
    ...(companies.data ?? []).map((c: any) => c.industry).filter(Boolean),
    ...(leads.data ?? []).flatMap((l: any) => l.tags ?? []),
  ];
  allTags.forEach((tag: string) => {
    const n = tag.toLowerCase();
    sectorCounts[n] = (sectorCounts[n] ?? 0) + 1;
  });
  const totalTags = Object.values(sectorCounts).reduce((a, b) => a + b, 0) || 1;
  const sectorDistribution = Object.fromEntries(
    Object.entries(sectorCounts).sort(([, a], [, b]) => b - a).slice(0, 10)
      .map(([k, v]) => [k, Math.round((v / totalTags) * 100)])
  );
  const dominantSectors = Object.keys(sectorDistribution).slice(0, 5);

  // Monthly demand calendar
  const monthCounts: Record<string, number> = {};
  [...(contacts.data ?? []).map((c: any) => c.created_at), ...(leads.data ?? []).map((l: any) => l.created_at)]
    .forEach((date: string) => {
      if (!date) return;
      const month = new Date(date).toLocaleString('pt-PT', { month: 'short' }).toLowerCase();
      monthCounts[month] = (monthCounts[month] ?? 0) + 1;
    });
  const totalMonthly = Object.values(monthCounts).reduce((a, b) => a + b, 1);
  const avgMonthly = totalMonthly / Math.max(Object.keys(monthCounts).length, 1);
  const demandCalendar = Object.fromEntries(
    Object.entries(monthCounts).map(([m, c]) => [m, Math.round((c / avgMonthly) * 100) / 100])
  );
  const peakMonths = Object.entries(demandCalendar).filter(([, v]) => v > 1.2).map(([m]) => m);
  const lowMonths = Object.entries(demandCalendar).filter(([, v]) => v < 0.8).map(([m]) => m);

  // Lead sources
  const leadSources = (leads.data ?? []).reduce((acc: Record<string, number>, l: any) => {
    const src = l.source ?? 'unknown';
    acc[src] = (acc[src] ?? 0) + 1;
    return acc;
  }, {});

  const wonRevenue = (wonDeals.data ?? []).reduce((s: number, d: any) => s + (d.value ?? 0), 0);

  const systemPrompt = `${bizContextPrompt}\n\nÉs um analista de mercado estratégico especializado em PMEs. Analisa dados internos de CRM e produz insights de inteligência de mercado accionáveis. Usa português de Portugal. Sê específico, usa dados reais para suportar cada insight.`;

  const userPrompt = `Analisa a inteligência de mercado deste workspace CRM.

## Dados do período (${periodDays} dias)
- Novos contactos: ${contacts.data?.length ?? 0}
- Empresas no CRM: ${companies.data?.length ?? 0}
- Novos leads: ${leads.data?.length ?? 0}
- Oportunidades activas: ${opportunities.data?.length ?? 0}
- Negócios ganhos: ${wonDeals.data?.length ?? 0} (€${wonRevenue.toLocaleString('pt-PT')})
- Negócios perdidos: ${lostDeals.data?.length ?? 0}

## Distribuição sectorial (top 10)
${JSON.stringify(sectorDistribution, null, 2)}

## Calendário de procura (índice mensal, 1.0 = baseline)
${JSON.stringify(demandCalendar, null, 2)}

## Fontes de leads
${JSON.stringify(leadSources, null, 2)}`;

  const toolSchema = {
    name: 'market_analysis',
    description: 'Structured market intelligence analysis',
    parameters: {
      type: 'object',
      properties: {
        market_signals: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              signal_type: { type: 'string', enum: ['trend_up', 'trend_down', 'seasonal', 'anomaly', 'opportunity'] },
              title: { type: 'string' },
              description: { type: 'string' },
              evidence: { type: 'string' },
              strength: { type: 'string', enum: ['weak', 'moderate', 'strong'] },
              sector: { type: 'string' },
              confidence: { type: 'number' },
            },
            required: ['signal_type', 'title', 'description', 'evidence', 'strength', 'confidence'],
          },
        },
        competitive_signals: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              signal: { type: 'string' },
              implication: { type: 'string' },
              recommended_action: { type: 'string' },
            },
            required: ['signal', 'implication', 'recommended_action'],
          },
        },
        untapped_segments: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              segment: { type: 'string' },
              estimated_size: { type: 'string' },
              entry_difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] },
              rationale: { type: 'string' },
            },
            required: ['segment', 'estimated_size', 'entry_difficulty', 'rationale'],
          },
        },
        market_summary: { type: 'string' },
        key_findings: { type: 'array', items: { type: 'string' } },
      },
      required: ['market_signals', 'competitive_signals', 'untapped_segments', 'market_summary', 'key_findings'],
    },
  };

  const analysis = await callAI(apiKey, systemPrompt, userPrompt, toolSchema);

  // Invalidate old and insert
  await supabase.from('imo_market_insights').update({ is_stale: true }).eq('workspace_id', workspaceId).eq('is_stale', false);

  const { data: report, error } = await supabase.from('imo_market_insights').insert({
    workspace_id: workspaceId,
    period_start: periodStart,
    period_end: periodEnd,
    dominant_sectors: dominantSectors,
    sector_distribution: sectorDistribution,
    market_signals: analysis.market_signals ?? [],
    competitive_signals: analysis.competitive_signals ?? [],
    demand_calendar: demandCalendar,
    peak_months: peakMonths,
    low_months: lowMonths,
    untapped_segments: analysis.untapped_segments ?? [],
    market_summary: analysis.market_summary,
    key_findings: analysis.key_findings ?? [],
    expires_at: new Date(Date.now() + 12 * 3600000).toISOString(),
  }).select().single();

  if (error) throw error;
  return report;
}

// ── Growth Insights Generator ──────────────────────────────────────────
async function generateGrowthInsights(
  supabase: any,
  apiKey: string,
  workspaceId: string,
  periodDays: number,
  bizContextPrompt: string,
) {
  const cutoffDate = new Date(Date.now() - periodDays * 86400000).toISOString();
  const reactivationCutoff = new Date(Date.now() - 60 * 86400000).toISOString();

  const [allOpps, wonOpps, lostOpps, staleContacts, leadsBySource, companyStats] = await Promise.all([
    supabase.from('opportunities').select('stage_id, value, source, status, probability, created_at').eq('workspace_id', workspaceId).limit(400),
    supabase.from('opportunities').select('value, source, stage_id').eq('workspace_id', workspaceId).eq('status', 'won').gte('created_at', cutoffDate).limit(200),
    supabase.from('opportunities').select('value, source, stage_id').eq('workspace_id', workspaceId).eq('status', 'lost').gte('created_at', cutoffDate).limit(200),
    supabase.from('contacts').select('id, name, updated_at, company, tags').eq('workspace_id', workspaceId).lt('updated_at', reactivationCutoff).order('updated_at', { ascending: true }).limit(20),
    supabase.from('leads').select('source, status, score, created_at').eq('workspace_id', workspaceId).gte('created_at', cutoffDate).limit(300),
    supabase.from('companies').select('industry, size').eq('workspace_id', workspaceId).limit(200),
  ]);

  // Channel stats
  const sourceStats: Record<string, { total: number; won: number; totalValue: number }> = {};
  (allOpps.data ?? []).forEach((o: any) => {
    const src = o.source ?? 'unknown';
    if (!sourceStats[src]) sourceStats[src] = { total: 0, won: 0, totalValue: 0 };
    sourceStats[src].total++;
    if (o.status === 'won') {
      sourceStats[src].won++;
      sourceStats[src].totalValue += o.value ?? 0;
    }
  });

  const channelAnalysis = Object.entries(sourceStats)
    .filter(([, s]) => s.total >= 2)
    .map(([channel, stats]) => ({
      channel,
      deal_count: stats.total,
      conversion_rate: stats.total > 0 ? Math.round((stats.won / stats.total) * 100) / 100 : 0,
      avg_deal_value: stats.won > 0 ? Math.round(stats.totalValue / stats.won) : 0,
    }))
    .sort((a, b) => b.conversion_rate - a.conversion_rate);

  // Reactivation targets
  const reactivationTargets = (staleContacts.data ?? []).slice(0, 10).map((c: any) => ({
    contact_id: c.id,
    contact_name: c.name ?? 'Sem nome',
    last_interaction_days: Math.floor((Date.now() - new Date(c.updated_at).getTime()) / 86400000),
  }));

  // Previous growth score
  const { data: previousGrowth } = await supabase
    .from('imo_growth_insights')
    .select('growth_score')
    .eq('workspace_id', workspaceId)
    .order('generated_at', { ascending: false })
    .limit(1).maybeSingle();

  const totalRevenue = (wonOpps.data ?? []).reduce((s: number, o: any) => s + (o.value ?? 0), 0);
  const avgDealValue = wonOpps.data?.length ? Math.round(totalRevenue / wonOpps.data.length) : 0;
  const overallWinRate = allOpps.data?.length ? Math.round(((wonOpps.data?.length ?? 0) / allOpps.data.length) * 100) : 0;

  const systemPrompt = `${bizContextPrompt}\n\nÉs um consultor de crescimento de negócios especializado em estratégias para PMEs. Analisa dados de CRM e produz um plano de crescimento concreto e accionável. Usa português de Portugal. Sê específico e accionável.`;

  const userPrompt = `Analisa e gera um plano de crescimento.

## Métricas principais (${periodDays} dias)
- Total oportunidades: ${allOpps.data?.length ?? 0}
- Ganhos: ${wonOpps.data?.length ?? 0}
- Perdidos: ${lostOpps.data?.length ?? 0}
- Taxa conversão: ${overallWinRate}%
- Receita: €${totalRevenue.toLocaleString('pt-PT')}
- Valor médio/deal: €${avgDealValue.toLocaleString('pt-PT')}

## Performance por canal
${JSON.stringify(channelAnalysis, null, 2)}

## Indústrias no CRM
${JSON.stringify(Object.entries((companyStats.data ?? []).reduce((acc: Record<string, number>, c: any) => { acc[c.industry ?? 'outros'] = (acc[c.industry ?? 'outros'] ?? 0) + 1; return acc; }, {})).map(([k, v]) => ({ industry: k, count: v })), null, 2)}

## Candidatos reactivação (sem actividade >60d)
${JSON.stringify(reactivationTargets, null, 2)}

## Score crescimento anterior: ${previousGrowth?.growth_score ?? 'N/A'}`;

  const toolSchema = {
    name: 'growth_plan',
    description: 'Structured growth analysis and recommendations',
    parameters: {
      type: 'object',
      properties: {
        growth_score: { type: 'integer', description: 'Overall growth health 0-100' },
        top_priority: { type: 'string' },
        growth_summary: { type: 'string' },
        opportunities: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              rank: { type: 'integer' },
              title: { type: 'string' },
              category: { type: 'string', enum: ['acquisition', 'retention', 'expansion', 'reactivation', 'product', 'channel'] },
              description: { type: 'string' },
              expected_impact: { type: 'string', enum: ['low', 'medium', 'high', 'very_high'] },
              effort_required: { type: 'string', enum: ['low', 'medium', 'high'] },
              time_to_impact_days: { type: 'integer' },
              evidence: { type: 'string' },
              specific_actions: { type: 'array', items: { type: 'string' } },
              target_segment: { type: 'string' },
            },
            required: ['rank', 'title', 'category', 'description', 'expected_impact', 'effort_required', 'time_to_impact_days', 'evidence', 'specific_actions'],
          },
        },
        channel_analysis: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              channel: { type: 'string' },
              deal_count: { type: 'integer' },
              conversion_rate: { type: 'number' },
              avg_deal_value: { type: 'number' },
              performance: { type: 'string', enum: ['underperforming', 'average', 'strong'] },
              recommendation: { type: 'string' },
            },
            required: ['channel', 'performance', 'recommendation'],
          },
        },
        segment_analysis: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              segment: { type: 'string' },
              current_penetration: { type: 'number' },
              win_rate: { type: 'number' },
              avg_deal_value: { type: 'number' },
              growth_potential: { type: 'string', enum: ['low', 'medium', 'high'] },
              recommendation: { type: 'string' },
            },
            required: ['segment', 'growth_potential', 'recommendation'],
          },
        },
        reactivation_targets: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              contact_id: { type: 'string' },
              contact_name: { type: 'string' },
              last_interaction_days: { type: 'integer' },
              reactivation_reason: { type: 'string' },
            },
            required: ['contact_name', 'reactivation_reason'],
          },
        },
        quick_wins: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              action: { type: 'string' },
              expected_result: { type: 'string' },
              effort_hours: { type: 'integer' },
            },
            required: ['action', 'expected_result', 'effort_hours'],
          },
        },
        roadmap_90d: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              week_range: { type: 'string' },
              focus: { type: 'string' },
              actions: { type: 'array', items: { type: 'string' } },
              kpi: { type: 'string' },
            },
            required: ['week_range', 'focus', 'actions', 'kpi'],
          },
        },
      },
      required: ['growth_score', 'top_priority', 'growth_summary', 'opportunities', 'quick_wins', 'roadmap_90d'],
    },
  };

  const analysis = await callAI(apiKey, systemPrompt, userPrompt, toolSchema);

  const growthScoreDelta = previousGrowth?.growth_score != null
    ? (analysis.growth_score ?? 0) - previousGrowth.growth_score
    : null;

  await supabase.from('imo_growth_insights').update({ is_stale: true }).eq('workspace_id', workspaceId).eq('is_stale', false);

  const { data: report, error } = await supabase.from('imo_growth_insights').insert({
    workspace_id: workspaceId,
    opportunities: analysis.opportunities ?? [],
    channel_analysis: analysis.channel_analysis ?? channelAnalysis.map((c: any) => ({ ...c, performance: 'average', recommendation: '' })),
    segment_analysis: analysis.segment_analysis ?? [],
    reactivation_targets: analysis.reactivation_targets ?? reactivationTargets.map((r: any) => ({ ...r, reactivation_reason: 'Sem actividade recente' })),
    quick_wins: analysis.quick_wins ?? [],
    roadmap_90d: analysis.roadmap_90d ?? [],
    growth_score: analysis.growth_score ?? 50,
    growth_score_delta: growthScoreDelta,
    growth_summary: analysis.growth_summary,
    top_priority: analysis.top_priority,
    expires_at: new Date(Date.now() + 12 * 3600000).toISOString(),
  }).select().single();

  if (error) throw error;
  return report;
}
