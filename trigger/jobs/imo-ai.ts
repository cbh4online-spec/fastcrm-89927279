import { schedules, logger } from '@trigger.dev/sdk/v3'
import { getSupabaseClient, invokeEdgeFunction } from '../lib/supabase'

// IMO AI weekly refresh: every Sunday at 02:00 UTC
export const imoAiWeeklyRefresh = schedules.task({
  id: 'imo-ai-weekly-refresh',
  cron: '0 2 * * 0',
  maxDuration: 1800,
  run: async () => {
    const supabase = getSupabaseClient()
    logger.info('IMO AI weekly refresh started')

    const { data: workspaces } = await supabase
      .from('workspaces')
      .select('id')
      .eq('status', 'active')
      .in('plan', ['pro', 'agency'])

    if (!workspaces?.length) return { refreshed: 0 }

    const batchSize = 5
    let succeeded = 0

    for (let i = 0; i < workspaces.length; i += batchSize) {
      const batch = workspaces.slice(i, i + batchSize)
      const results = await Promise.allSettled(
        batch.map(ws =>
          invokeEdgeFunction('ai-growth-insights', {
            workspace_id: ws.id,
            analysis_type: 'both',
            force_refresh: true,
          })
        )
      )
      succeeded += results.filter(r => r.status === 'fulfilled').length

      if (i + batchSize < workspaces.length) {
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }

    logger.info('IMO AI refresh completed', { succeeded, total: workspaces.length })
    return { refreshed: workspaces.length, succeeded }
  },
})
