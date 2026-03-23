import { schedules, task, logger } from '@trigger.dev/sdk/v3'
import { getSupabaseClient, invokeEdgeFunction } from '../lib/supabase'

// B2B plan cycle processor: daily at 6:00 UTC
export const b2bPlanCycleProcessor = schedules.task({
  id: 'b2b-plan-cycle-processor',
  cron: '0 6 * * *',
  maxDuration: 900,
  run: async () => {
    const supabase = getSupabaseClient()
    logger.info('B2B plan cycle processor started')

    const today = new Date().toISOString().split('T')[0]
    const { data: duePlans } = await supabase
      .from('b2b_purchase_plans')
      .select('id, workspace_id, client_id, next_billing_date')
      .eq('status', 'active')
      .lte('next_billing_date', today)

    if (!duePlans?.length) {
      logger.info('No plans due for billing today')
      return { processed: 0 }
    }

    logger.info(`Processing ${duePlans.length} due plans`)

    const results = await Promise.allSettled(
      duePlans.map(plan =>
        processSinglePlan.triggerAndWait({
          plan_id: plan.id,
          workspace_id: plan.workspace_id,
        })
      )
    )

    const succeeded = results.filter(r => r.status === 'fulfilled').length
    logger.info('B2B plan processing completed', { succeeded, total: duePlans.length })
    return { processed: duePlans.length, succeeded }
  },
})

export const processSinglePlan = task({
  id: 'process-b2b-plan',
  maxDuration: 300,
  retry: { maxAttempts: 2, minTimeoutInMs: 5000 },
  run: async (payload: { plan_id: string; workspace_id: string }) => {
    logger.info('Processing B2B plan', payload)

    const scheduleResult = await invokeEdgeFunction('b2b-plan-schedule-run', {
      plan_id: payload.plan_id,
      workspace_id: payload.workspace_id,
    })

    await invokeEdgeFunction('b2b-plan-generate-invoice', {
      plan_id: payload.plan_id,
      workspace_id: payload.workspace_id,
    })

    await invokeEdgeFunction('b2b-plan-generate-order', {
      plan_id: payload.plan_id,
      workspace_id: payload.workspace_id,
    })

    await invokeEdgeFunction('b2b-plan-notify-cycle', {
      plan_id: payload.plan_id,
      workspace_id: payload.workspace_id,
    })

    logger.info('B2B plan processed', { plan_id: payload.plan_id })
    return { success: true, schedule_result: scheduleResult }
  },
})
