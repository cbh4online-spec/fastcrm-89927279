import { schedules, task, logger } from '@trigger.dev/sdk/v3'
import { getSupabaseClient, invokeEdgeFunction } from '../lib/supabase'

// Daily brief: runs at 07:00 UTC
export const dailyBriefGenerator = schedules.task({
  id: 'daily-brief-generator',
  cron: '0 7 * * *',
  maxDuration: 900,
  run: async () => {
    const supabase = getSupabaseClient()
    logger.info('Daily brief generator started')

    const { data: workspaces } = await supabase
      .from('workspaces')
      .select('id, plan')
      .eq('status', 'active')
      .in('plan', ['pro', 'agency'])

    if (!workspaces?.length) {
      logger.info('No eligible workspaces for daily brief')
      return { generated: 0 }
    }

    const results = await Promise.allSettled(
      workspaces.map(ws =>
        generateWorkspaceBrief.triggerAndWait({ workspace_id: ws.id })
      )
    )

    const succeeded = results.filter(r => r.status === 'fulfilled').length
    logger.info('Daily brief completed', { succeeded, total: workspaces.length })
    return { generated: workspaces.length, succeeded }
  },
})

export const generateWorkspaceBrief = task({
  id: 'generate-workspace-brief',
  maxDuration: 180,
  retry: { maxAttempts: 1 },
  run: async (payload: { workspace_id: string }) => {
    logger.info('Generating brief for workspace', payload)
    const result = await invokeEdgeFunction('daily-revenue-brief', {
      workspace_id: payload.workspace_id,
      triggered_by: 'schedule',
    })
    return result
  },
})
