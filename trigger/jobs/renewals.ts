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
    const supabase = getSupabaseClient()

    const [checkResult, healthResult] = await Promise.allSettled([
      invokeEdgeFunction('check-renewals', { workspace_id: payload.workspace_id }),
      invokeEdgeFunction('renewals-health-score', { workspace_id: payload.workspace_id }),
    ])

    // Check for contracts that need automated alerts
    const now = new Date()
    const thresholds = [30, 15, 7, 1, 0]

    const { data: contracts } = await supabase
      .from('renewal_contracts')
      .select('id, next_renewal_date, alert_settings, owner_user_id')
      .eq('workspace_id', payload.workspace_id)
      .eq('status', 'active')
      .not('next_renewal_date', 'is', null)

    const alertResults: any[] = []
    for (const contract of (contracts || [])) {
      if (!contract.next_renewal_date) continue
      const settings = (contract.alert_settings as any) || { thresholds: [30, 15, 7, 1], notify_user: true, notify_client: false }
      const daysUntil = Math.ceil((new Date(contract.next_renewal_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

      let alertType: string | null = null
      if (daysUntil < 0) alertType = 'overdue'
      else if (settings.thresholds?.includes(daysUntil)) alertType = `${daysUntil}d`

      if (alertType) {
        const recipients = settings.notify_user && settings.notify_client ? 'both'
          : settings.notify_client ? 'client' : 'user'
        try {
          const result = await invokeEdgeFunction('renewal-alert-email', {
            contract_id: contract.id,
            workspace_id: payload.workspace_id,
            alert_type: alertType,
            recipients,
          })
          alertResults.push({ contract_id: contract.id, alert_type: alertType, result })
        } catch (e: any) {
          logger.warn('Alert send failed', { contract_id: contract.id, error: e.message })
        }
      }
    }

    return {
      check: checkResult.status === 'fulfilled' ? checkResult.value : null,
      health: healthResult.status === 'fulfilled' ? healthResult.value : null,
      alerts_sent: alertResults.length,
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
