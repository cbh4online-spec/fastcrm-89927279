import { schedules, logger } from '@trigger.dev/sdk/v3'
import { invokeEdgeFunction } from '../lib/supabase'

// LeadChef follow-up dispatcher: every 15 minutes
export const leadchefFollowupDispatcher = schedules.task({
  id: 'leadchef-followup-dispatcher',
  cron: '*/15 * * * *',
  maxDuration: 300,
  run: async () => {
    logger.info('LeadChef follow-up dispatcher started')
    const result = await invokeEdgeFunction('leadchef-followup-dispatcher', { limit: 200 })
    logger.info('LeadChef follow-up dispatcher completed', { result })
    return result
  },
})

// LeadChef daily recompute: every day at 06:00 UTC
export const leadchefDailyRecompute = schedules.task({
  id: 'leadchef-daily-recompute',
  cron: '0 6 * * *',
  maxDuration: 600,
  run: async () => {
    logger.info('LeadChef daily recompute started')
    const result = await invokeEdgeFunction('leadchef-daily-recompute', { limit: 1000 })
    logger.info('LeadChef daily recompute completed', { result })
    return result
  },
})
