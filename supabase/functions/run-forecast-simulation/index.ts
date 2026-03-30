import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ForecastInput {
  workspace_id: string;
  scenario_type?: string;
  inputs?: Record<string, number>;
}

interface BaselineOutput {
  forecast_revenue_30d: number;
  forecast_revenue_90d: number;
  forecast_deals_30d: number;
  forecast_conversion_rate: number;
  pipeline_coverage: number;
  execution_capacity_score: number;
  risk_of_miss_target: string;
}

const SCENARIO_MODIFIERS: Record<string, { label: string; effects: Record<string, number>; assumptions: string[] }> = {
  follow_up_boost: {
    label: 'Reforçar Follow-up',
    effects: { conversion_boost: 0.15, deals_boost: 0.12, workload_increase: 0.10 },
    assumptions: [
      'Follow-up mais frequente aumenta conversão em ~15%',
      'Cada follow-up adicional gera ~10% mais carga operacional',
      'Efeito visível em 2-4 semanas',
    ],
  },
  channel_switch: {
    label: 'Trocar Canal (Email → WhatsApp)',
    effects: { conversion_boost: 0.20, deals_boost: 0.10, workload_increase: 0.05 },
    assumptions: [
      'WhatsApp tem taxa de abertura ~3x superior a email',
      'Conversão sobe ~20% em leads não responsivas',
      'Requer configuração de templates aprovados',
    ],
  },
  sla_reduction: {
    label: 'Reduzir SLA de Follow-up',
    effects: { conversion_boost: 0.10, deals_boost: 0.08, workload_increase: 0.15 },
    assumptions: [
      'Respostas mais rápidas aumentam engagement',
      'SLA reduzido exige mais capacidade operacional',
      'Efeito imediato em pipeline ativo',
    ],
  },
  recovery_boost: {
    label: 'Reforçar Recovery de Carrinhos',
    effects: { revenue_recovery: 0.25, deals_boost: 0.05, workload_increase: 0.08 },
    assumptions: [
      'Recovery ativo recupera ~25% de carrinhos abandonados',
      'Sequência curta (2-3 passos) tem melhor performance',
      'Efeito em 1-2 semanas',
    ],
  },
  agent_swap: {
    label: 'Trocar Agente/Equipa',
    effects: { conversion_boost: 0.10, execution_boost: 0.15, workload_increase: -0.05 },
    assumptions: [
      'Agentes especializados convertem melhor em contextos específicos',
      'Troca baseada em histórico de performance',
      'Pode reduzir carga se agente é mais eficiente',
    ],
  },
  auto_execution: {
    label: 'Aumentar Auto-Execução',
    effects: { execution_boost: 0.30, workload_increase: -0.20, conversion_boost: 0.05 },
    assumptions: [
      'Automação reduz backlog significativamente',
      'Tarefas repetitivas são candidatas ideais',
      'Ligeira melhoria em conversão por velocidade',
    ],
  },
  backlog_reduction: {
    label: 'Reduzir Backlog de Tarefas',
    effects: { execution_boost: 0.20, conversion_boost: 0.08, workload_increase: -0.10 },
    assumptions: [
      'Menos backlog = mais capacidade para novas ações',
      'Conversão melhora com execução mais rápida',
      'Requer triagem e priorização inicial',
    ],
  },
  meeting_boost: {
    label: 'Reforçar Reuniões Comerciais',
    effects: { conversion_boost: 0.25, deals_boost: 0.20, workload_increase: 0.20 },
    assumptions: [
      'Reuniões são o passo de maior conversão no funil',
      'Cada reunião adicional gera ~20% mais deals',
      'Requer disponibilidade da equipa comercial',
    ],
  },
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const body: ForecastInput = await req.json();
    const { workspace_id, scenario_type, inputs } = body;

    if (!workspace_id) {
      return new Response(JSON.stringify({ error: 'workspace_id required' }), { status: 400, headers: corsHeaders });
    }

    // 1. Collect signals
    const [
      { data: bizCtx },
      { data: healthState },
      { count: totalActions },
      { count: completedActions },
      { count: pendingTasks },
    ] = await Promise.all([
      supabase.from('business_context').select('*').eq('workspace_id', workspace_id).maybeSingle(),
      supabase.from('workspace_operating_state').select('*').eq('workspace_id', workspace_id).maybeSingle(),
      supabase.from('action_executions').select('*', { count: 'exact', head: true }).eq('workspace_id', workspace_id),
      supabase.from('action_executions').select('*', { count: 'exact', head: true }).eq('workspace_id', workspace_id).eq('status', 'completed'),
      supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('workspace_id', workspace_id).in('status', ['pending', 'in_progress']),
    ]);

    const monthlyTarget = bizCtx?.monthly_revenue_target || 10000;
    const quarterlyTarget = bizCtx?.quarterly_revenue_target || monthlyTarget * 3;
    const avgTicket = bizCtx?.average_ticket || 500;
    const salesCycleDays = bizCtx?.sales_cycle_days || 30;
    const dealsTarget = bizCtx?.deals_target_monthly || Math.ceil(monthlyTarget / avgTicket);

    const executionRate = totalActions && completedActions ? completedActions / totalActions : 0.6;
    const backlogSize = pendingTasks || 0;
    const healthScore = healthState?.overall_health_score || 60;

    // 2. Calculate baseline
    const pipelineCoverage = Math.min((avgTicket * dealsTarget * 1.5) / monthlyTarget, 3.0);
    const executionCapacity = Math.min(executionRate * 100, 100);
    const baseConversion = 0.15 + (executionRate * 0.10);
    const forecastDeals30d = Math.round(dealsTarget * baseConversion * (healthScore / 100) * 3);
    const forecastRevenue30d = forecastDeals30d * avgTicket;
    const forecastRevenue90d = forecastRevenue30d * 2.8;

    const gapPct = monthlyTarget > 0 ? forecastRevenue30d / monthlyTarget : 1;
    let riskOfMiss = 'low';
    if (gapPct < 0.5) riskOfMiss = 'critical';
    else if (gapPct < 0.7) riskOfMiss = 'high';
    else if (gapPct < 0.9) riskOfMiss = 'medium';

    const baseline: BaselineOutput = {
      forecast_revenue_30d: Math.round(forecastRevenue30d),
      forecast_revenue_90d: Math.round(forecastRevenue90d),
      forecast_deals_30d: forecastDeals30d,
      forecast_conversion_rate: Math.round(baseConversion * 100) / 100,
      pipeline_coverage: Math.round(pipelineCoverage * 100) / 100,
      execution_capacity_score: Math.round(executionCapacity),
      risk_of_miss_target: riskOfMiss,
    };

    const baseAssumptions = [
      `Meta mensal: €${monthlyTarget}`,
      `Ticket médio: €${avgTicket}`,
      `Ciclo de venda: ${salesCycleDays} dias`,
      `Taxa de execução atual: ${Math.round(executionRate * 100)}%`,
      `Backlog atual: ${backlogSize} tarefas`,
      `Health score: ${healthScore}/100`,
    ];

    const inputSnapshot = {
      monthly_revenue_target: monthlyTarget,
      quarterly_revenue_target: quarterlyTarget,
      average_ticket: avgTicket,
      sales_cycle_days: salesCycleDays,
      deals_target_monthly: dealsTarget,
      execution_rate: executionRate,
      backlog_size: backlogSize,
      health_score: healthScore,
    };

    // 3. Persist baseline run
    const { data: baselineRun } = await supabase.from('forecast_runs').insert({
      workspace_id,
      run_type: 'baseline',
      input_snapshot_json: inputSnapshot,
      output_snapshot_json: baseline,
      assumptions_json: baseAssumptions,
      confidence: Math.min(0.99, 0.4 + (executionRate * 0.3) + (healthScore / 300)),
    }).select('id').single();

    let scenarioResult = null;

    // 4. If scenario requested, apply modifiers
    if (scenario_type && SCENARIO_MODIFIERS[scenario_type]) {
      const mod = SCENARIO_MODIFIERS[scenario_type];
      const intensity = inputs?.intensity ?? 100;
      const factor = intensity / 100;

      const convBoost = (mod.effects.conversion_boost || 0) * factor;
      const dealsBoost = (mod.effects.deals_boost || 0) * factor;
      const execBoost = (mod.effects.execution_boost || 0) * factor;
      const recoveryBoost = (mod.effects.revenue_recovery || 0) * factor;
      const workloadDelta = (mod.effects.workload_increase || 0) * factor;

      const scenarioConversion = baseConversion * (1 + convBoost);
      const scenarioDeals = Math.round(forecastDeals30d * (1 + dealsBoost));
      const scenarioRevenue30d = Math.round(scenarioDeals * avgTicket * (1 + recoveryBoost));
      const scenarioRevenue90d = Math.round(scenarioRevenue30d * 2.8);
      const scenarioExecCapacity = Math.min(100, executionCapacity * (1 + execBoost));

      const scenarioGapPct = monthlyTarget > 0 ? scenarioRevenue30d / monthlyTarget : 1;
      let scenarioRisk = 'low';
      if (scenarioGapPct < 0.5) scenarioRisk = 'critical';
      else if (scenarioGapPct < 0.7) scenarioRisk = 'high';
      else if (scenarioGapPct < 0.9) scenarioRisk = 'medium';

      const scenarioOutputs = {
        forecast_revenue_30d: scenarioRevenue30d,
        forecast_revenue_90d: scenarioRevenue90d,
        forecast_deals_30d: scenarioDeals,
        forecast_conversion_rate: Math.round(scenarioConversion * 100) / 100,
        pipeline_coverage: baseline.pipeline_coverage,
        execution_capacity_score: Math.round(scenarioExecCapacity),
        risk_of_miss_target: scenarioRisk,
      };

      const deltas = {
        revenue_30d_delta: scenarioRevenue30d - baseline.forecast_revenue_30d,
        revenue_90d_delta: scenarioRevenue90d - baseline.forecast_revenue_90d,
        deals_delta: scenarioDeals - baseline.forecast_deals_30d,
        conversion_delta: Math.round((scenarioConversion - baseConversion) * 100) / 100,
        execution_delta: Math.round(scenarioExecCapacity - executionCapacity),
        workload_delta_pct: Math.round(workloadDelta * 100),
        risk_change: scenarioRisk !== riskOfMiss ? `${riskOfMiss} → ${scenarioRisk}` : 'sem alteração',
      };

      const scenarioConfidence = Math.min(0.95, 0.35 + (executionRate * 0.2) + (healthScore / 400));

      const { data: scenario } = await supabase.from('simulation_scenarios').insert({
        workspace_id,
        title: mod.label,
        description: `Simulação: ${mod.label} a ${intensity}% de intensidade`,
        scenario_type,
        status: 'simulated',
        inputs_json: { ...inputSnapshot, intensity, scenario_type },
        outputs_json: scenarioOutputs,
        delta_json: deltas,
        assumptions: [...baseAssumptions, ...mod.assumptions.map(a => `[Cenário] ${a}`)],
        confidence: scenarioConfidence,
      }).select('id').single();

      // Update forecast run with scenario link
      if (scenario?.id && baselineRun?.id) {
        await supabase.from('forecast_runs').insert({
          workspace_id,
          scenario_id: scenario.id,
          run_type: 'scenario',
          input_snapshot_json: { ...inputSnapshot, intensity, scenario_type },
          output_snapshot_json: scenarioOutputs,
          assumptions_json: [...baseAssumptions, ...mod.assumptions],
          confidence: scenarioConfidence,
        });
      }

      scenarioResult = {
        id: scenario?.id,
        title: mod.label,
        scenario_type,
        outputs: scenarioOutputs,
        deltas,
        assumptions: mod.assumptions,
        confidence: scenarioConfidence,
      };
    }

    return new Response(JSON.stringify({
      baseline,
      baseline_run_id: baselineRun?.id,
      assumptions: baseAssumptions,
      scenario: scenarioResult,
      input_snapshot: inputSnapshot,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err) {
    console.error('Forecast simulation error:', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
