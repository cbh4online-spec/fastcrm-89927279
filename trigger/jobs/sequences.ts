import { schedules, task, logger } from '@trigger.dev/sdk/v3'
import { invokeEdgeFunction } from '../lib/supabase'

// Sequence step processor: runs every 15 minutes
export const sequenceStepProcessor = schedules.task({
  id: 'sequence-step-processor',
  cron: '*/15 * * * *',
  maxDuration: 600,
  run: async () => {
    logger.info('Sequence step processor started')
    const result = await invokeEdgeFunction('auto-followup-scheduler', {
      triggered_by: 'schedule',
    })
    logger.info('Sequence step processor completed', { result })
    return result
  },
})

// Trigger a specific sequence step immediately
export const triggerSequenceStep = task({
  id: 'trigger-sequence-step',
  maxDuration: 60,
  retry: { maxAttempts: 3, minTimeoutInMs: 2000 },
  run: async (payload: {
    enrollment_id: string
    step_id: string
    workspace_id: string
    delay_minutes: number
  }) => {
    if (payload.delay_minutes > 0) {
      await new Promise(resolve => setTimeout(resolve, payload.delay_minutes * 60 * 1000))
    }
    logger.info('Triggering sequence step', payload)
    const result = await invokeEdgeFunction('auto-followup-scheduler', {
      enrollment_id: payload.enrollment_id,
      step_id: payload.step_id,
      workspace_id: payload.workspace_id,
      mode: 'single_step',
    })
    return result
  },
})
