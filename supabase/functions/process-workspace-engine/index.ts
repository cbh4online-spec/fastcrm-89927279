import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WorkspaceSignals {
  pendingActions: number
  failedActions: number
  atRiskObjectives: number
  openNBAs: number
  pendingWorkItems: number
  failedWorkItems: number
  overdueTasks: number
  totalTasks: number
  activeAgents: number
  pausedAgents: number
  humanHandoffs: number
  recentFailures: number
}

function calcSubScore(good: number, bad: number, total: number): number {
  if (total === 0) return 70
  const ratio = bad / total
  return Math.max(0, Math.min(100, Math.round(100 - ratio * 100)))
}

function calcRisk(score: number): string {
  if (score >= 80) return 'low'
  if (score >= 60) return 'medium'
  if (score >= 40) return 'high'
  return 'critical'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { workspace_id } = await req.json()
    if (!workspace_id) {
      return new Response(JSON.stringify({ error: 'workspace_id required' }), { status: 400, headers: corsHeaders })
    }

    // Check settings
    const { data: settings } = await supabase
      .from('workspace_engine_settings')
      .select('*')
      .eq('workspace_id', workspace_id)
      .maybeSingle()

    // Collect signals in parallel
    const [
      actionsRes,
      objectivesRes,
      nbasRes,
      workItemsRes,
      tasksRes,
      botsRes,
      handoffsRes,
    ] = await Promise.all([
      supabase.from('action_executions').select('status', { count: 'exact', head: false })
        .eq('workspace_id', workspace_id).in('status', ['pending', 'failed']),
      supabase.from('business_objectives').select('status', { count: 'exact', head: false })
        .eq('workspace_id', workspace_id).eq('status', 'at_risk'),
      supabase.from('next_best_actions').select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspace_id).eq('status', 'pending'),
      supabase.from('agent_work_items').select('status', { count: 'exact', head: false })
        .eq('workspace_id', workspace_id).in('status', ['pending', 'in_progress', 'failed']),
      supabase.from('tasks').select('status', { count: 'exact', head: false })
        .eq('workspace_id', workspace_id).in('status', ['pending', 'overdue']),
      supabase.from('bots').select('status', { count: 'exact', head: false })
        .eq('workspace_id', workspace_id),
      supabase.from('agent_handoffs').select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspace_id).eq('status', 'escalated_to_human'),
    ])

    const pendingActions = (actionsRes.data || []).filter(a => a.status === 'pending').length
    const failedActions = (actionsRes.data || []).filter(a => a.status === 'failed').length
    const atRiskObjectives = objectivesRes.data?.length || 0
    const openNBAs = nbasRes.count || 0
    const pendingWorkItems = (workItemsRes.data || []).filter(w => w.status === 'pending' || w.status === 'in_progress').length
    const failedWorkItems = (workItemsRes.data || []).filter(w => w.status === 'failed').length
    const overdueTasks = (tasksRes.data || []).filter(t => t.status === 'overdue').length
    const totalTasks = tasksRes.count || 0
    const activeAgents = (botsRes.data || []).filter((b: any) => b.status === 'active').length
    const pausedAgents = (botsRes.data || []).filter((b: any) => b.status === 'paused').length
    const humanHandoffs = handoffsRes.count || 0

    // Calculate sub-scores
    const totalActions = pendingActions + failedActions + 1
    const execution_health = calcSubScore(0, failedActions + pendingActions, totalActions + 10)
    const revenue_health = calcSubScore(0, atRiskObjectives, atRiskObjectives + 5)
    const pipeline_health = calcSubScore(0, openNBAs > 20 ? 20 : 0, 20)
    const response_health = calcSubScore(0, overdueTasks, (totalTasks || 1))
    const context_health = Math.max(30, 100 - (openNBAs * 2))
    const automation_health = activeAgents > 0
      ? calcSubScore(activeAgents, pausedAgents + failedWorkItems, activeAgents + pausedAgents + failedWorkItems + 1)
      : 70

    // Weighted global score
    const health_score = Math.round(
      execution_health * 0.25 +
      revenue_health * 0.25 +
      pipeline_health * 0.1 +
      response_health * 0.15 +
      context_health * 0.1 +
      automation_health * 0.15
    )

    const risk_level = calcRisk(health_score)

    // Determine primary focus
    const scores = { execution_health, revenue_health, pipeline_health, response_health, context_health, automation_health }
    const worstArea = Object.entries(scores).sort((a, b) => a[1] - b[1])[0]
    const primary_focus = worstArea[0].replace('_health', '').replace('_', ' ')

    // Count existing active missions
    const { count: activeMissions } = await supabase
      .from('workspace_missions')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspace_id)
      .in('status', ['pending', 'active'])

    // Count blockers (high/critical alerts open)
    const { count: blockers } = await supabase
      .from('workspace_alerts')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspace_id)
      .eq('status', 'open')
      .in('severity', ['high', 'critical'])

    // Upsert state
    await supabase.from('workspace_operating_state').upsert({
      workspace_id,
      health_score,
      revenue_health,
      pipeline_health,
      execution_health,
      response_health,
      context_health,
      automation_health,
      risk_level,
      primary_focus,
      active_missions_count: activeMissions || 0,
      blockers_count: blockers || 0,
      last_recalculated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'workspace_id' })

    // Detect alerts
    const newAlerts: any[] = []

    if (failedActions > 5) {
      newAlerts.push({
        workspace_id, alert_type: 'execution_backlog', severity: failedActions > 15 ? 'critical' : 'high',
        title: `${failedActions} ações falhadas`, description: `Existem ${failedActions} action executions falhadas no workspace.`, status: 'open',
      })
    }
    if (atRiskObjectives > 0) {
      newAlerts.push({
        workspace_id, alert_type: 'revenue_drop', severity: atRiskObjectives > 3 ? 'critical' : 'high',
        title: `${atRiskObjectives} objetivos em risco`, description: `Objetivos comerciais em risco detetados.`, status: 'open',
      })
    }
    if (humanHandoffs > 3) {
      newAlerts.push({
        workspace_id, alert_type: 'human_attention_required', severity: 'high',
        title: `${humanHandoffs} escalações para humano`, description: `Handoffs para humano pendentes.`, status: 'open',
      })
    }
    if (overdueTasks > 10) {
      newAlerts.push({
        workspace_id, alert_type: 'no_response_risk', severity: 'high',
        title: `${overdueTasks} tarefas atrasadas`, description: `Tarefas atrasadas acumuladas.`, status: 'open',
      })
    }

    for (const alert of newAlerts) {
      // Avoid duplicates: only insert if no open alert of same type
      const { count } = await supabase.from('workspace_alerts')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspace_id).eq('alert_type', alert.alert_type).eq('status', 'open')
      if (!count || count === 0) {
        await supabase.from('workspace_alerts').insert(alert)
      }
    }

    // Auto-generate missions if enabled
    if (settings?.auto_mission_generation) {
      const missionCandidates: any[] = []

      if (execution_health < 50) {
        missionCandidates.push({
          workspace_id, title: 'Reduzir backlog de execução', mission_type: 'reduce_execution_backlog',
          priority: 'high', urgency: execution_health < 30 ? 'critical' : 'high',
          impact_estimate: failedActions * 50, status: 'pending',
        })
      }
      if (revenue_health < 50) {
        missionCandidates.push({
          workspace_id, title: 'Recuperar receita em risco', mission_type: 'recover_revenue',
          priority: 'high', urgency: 'high', impact_estimate: atRiskObjectives * 1000, status: 'pending',
        })
      }
      if (automation_health < 40) {
        missionCandidates.push({
          workspace_id, title: 'Estabilizar automação', mission_type: 'stabilize_automation',
          priority: 'medium', urgency: 'normal', status: 'pending',
        })
      }
      if (response_health < 40) {
        missionCandidates.push({
          workspace_id, title: 'Melhorar tempo de resposta', mission_type: 'improve_response_time',
          priority: 'high', urgency: 'high', status: 'pending',
        })
      }

      for (const mission of missionCandidates) {
        const { count } = await supabase.from('workspace_missions')
          .select('id', { count: 'exact', head: true })
          .eq('workspace_id', workspace_id).eq('mission_type', mission.mission_type).in('status', ['pending', 'active'])
        if (!count || count === 0) {
          await supabase.from('workspace_missions').insert(mission)
        }
      }
    }

    // Emit kernel event
    await supabase.from('kernel_events').insert({
      workspace_id,
      type: 'WORKSPACE.STATE_RECALCULATED',
      entity_kind: 'workspace',
      entity_id: workspace_id,
      actor_type: 'system',
      source_module: 'workspace-engine',
      payload: { health_score, risk_level, primary_focus },
      status: 'pending',
    })

    return new Response(JSON.stringify({
      health_score, risk_level, primary_focus,
      sub_scores: { revenue_health, pipeline_health, execution_health, response_health, context_health, automation_health },
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err) {
    console.error('process-workspace-engine error:', err)
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
