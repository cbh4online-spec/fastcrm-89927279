import { schedules, task, logger } from '@trigger.dev/sdk/v3'
import { getSupabaseClient, invokeEdgeFunction } from '../lib/supabase'

// Runs every 5 minutes — checks all workspaces for due AI Employee schedules
export const aiEmployeeScheduler = schedules.task({
  id: 'ai-employee-scheduler',
  cron: '*/5 * * * *',
  maxDuration: 300,
  run: async (payload) => {
    const supabase = getSupabaseClient()
    logger.info('AI Employee Scheduler started', { scheduledTime: payload.timestamp })

    const { data: dueEmployees, error } = await supabase
      .from('ai_employees')
      .select('id, workspace_id, name, next_run_at')
      .eq('status', 'active')
      .eq('schedule_enabled', true)
      .not('next_run_at', 'is', null)
      .lte('next_run_at', new Date().toISOString())

    if (error) {
      logger.error('Failed to fetch due employees', { error: error.message })
      throw error
    }

    if (!dueEmployees || dueEmployees.length === 0) {
      logger.info('No due employees found')
      return { dispatched: 0 }
    }

    logger.info(`Found ${dueEmployees.length} due employees`)

    const runs = await Promise.allSettled(
      dueEmployees.map(employee =>
        runAiEmployee.triggerAndWait({
          employee_id: employee.id,
          workspace_id: employee.workspace_id,
        })
      )
    )

    const succeeded = runs.filter(r => r.status === 'fulfilled').length
    const failed = runs.filter(r => r.status === 'rejected').length

    logger.info('AI Employee Scheduler completed', { succeeded, failed, total: dueEmployees.length })
    return { dispatched: dueEmployees.length, succeeded, failed }
  },
})

export const runAiEmployee = task({
  id: 'run-ai-employee',
  maxDuration: 600,
  retry: { maxAttempts: 2, minTimeoutInMs: 5000 },
  run: async (payload: { employee_id: string; workspace_id: string }) => {
    logger.info('Running AI Employee', payload)
    const result = await invokeEdgeFunction('ai-employee-executor', {
      employee_id: payload.employee_id,
      workspace_id: payload.workspace_id,
      triggered_by: 'schedule',
    })
    logger.info('AI Employee completed', { result })
    return result
  },
})
