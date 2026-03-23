import { schedules, task, logger } from '@trigger.dev/sdk/v3'
import { getSupabaseClient, invokeEdgeFunction } from '../lib/supabase'

// Daily renewal check: runs at 8:00 UTC
export const dailyRenewalCheck = schedules.task({
  id: 'daily-renewal-check',
  cron: '0 8 * * *',
  maxDuration: 600,
  run: async () => {
    const supabase = getSupabaseClient()
    logger.info('Daily renewal check started')

    const { data: workspaces } = await supabase
      .from('workspaces')
      .select('id')
      .eq('status', 'active')

    if (!workspaces?.length) {
      logger.info('No active workspaces found')
      return { workspaces_processed: 0 }
    }

    const results = await Promise.allSettled(
      workspaces.map(ws => checkWorkspaceRenewals.triggerAndWait({ workspace_id: ws.id }))
    )

    const succeeded = results.filter(r => r.status === 'fulfilled').length
    logger.info('Renewal check completed', { succeeded, total: workspaces.length })
    return { workspaces_processed: workspaces.length, succeeded }
  },
})

export const checkWorkspaceRenewals = task({
  id: 'check-workspace-renewals',
  maxDuration: 120,
  run: async (payload: { workspace_id: string }) => {
    logger.info('Checking renewals for workspace', { workspace_id: payload.workspace_id })
    const [checkResult, healthResult] = await Promise.allSettled([
      invokeEdgeFunction('check-renewals', { workspace_id: payload.workspace_id }),
      invokeEdgeFunction('renewals-health-score', { workspace_id: payload.workspace_id }),
    ])
    return {
      check: checkResult.status === 'fulfilled' ? checkResult.value : null,
      health: healthResult.status === 'fulfilled' ? healthResult.value : null,
    }
  },
})

// Weekly renewal AI suggestions: Monday at 9:00 UTC
export const weeklyRenewalSuggestions = schedules.task({
  id: 'weekly-renewal-suggestions',
  cron: '0 9 * * 1',
  maxDuration: 900,
  run: async () => {
    const supabase = getSupabaseClient()
    logger.info('Weekly renewal suggestions started')
    const { data: workspaces } = await supabase
      .from('workspaces')
      .select('id')
      .eq('status', 'active')

    const results = await Promise.allSettled(
      (workspaces ?? []).map(ws =>
        invokeEdgeFunction('renewals-ai-suggestions', { workspace_id: ws.id })
      )
    )
    const succeeded = results.filter(r => r.status === 'fulfilled').length
    logger.info('Weekly renewal suggestions completed', { succeeded })
    return { succeeded }
  },
})
