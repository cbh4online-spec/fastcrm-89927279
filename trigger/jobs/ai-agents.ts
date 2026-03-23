import { schedules, task, logger } from '@trigger.dev/sdk/v3'
import { invokeEdgeFunction } from '../lib/supabase'

// Lifecycle manager: runs every 2 minutes
export const aiAgentLifecycleManager = schedules.task({
  id: 'ai-agent-lifecycle-manager',
  cron: '*/2 * * * *',
  maxDuration: 60,
  run: async () => {
    logger.info('AI Agent Lifecycle check started')
    const result = await invokeEdgeFunction('ai-agent-lifecycle', {})
    logger.info('AI Agent Lifecycle completed', { result })
    return result
  },
})

// AI Agent scheduler: runs every 5 minutes
export const aiAgentScheduler = schedules.task({
  id: 'ai-agent-scheduler',
  cron: '*/5 * * * *',
  maxDuration: 120,
  run: async () => {
    logger.info('AI Agent Scheduler started')
    const result = await invokeEdgeFunction('ai-agent-scheduler', {})
    logger.info('AI Agent Scheduler completed', { result })
    return result
  },
})

// Triggered task: run a specific AI Agent job immediately
export const triggerAiAgentJob = task({
  id: 'trigger-ai-agent-job',
  maxDuration: 600,
  retry: { maxAttempts: 2, minTimeoutInMs: 3000 },
  run: async (payload: { job_id: string; workspace_id: string }) => {
    logger.info('Triggering AI Agent job', payload)
    const result = await invokeEdgeFunction('ai-agent-orchestrator', {
      job_id: payload.job_id,
      workspace_id: payload.workspace_id,
    })
    logger.info('AI Agent job dispatched', { result })
    return result
  },
})
