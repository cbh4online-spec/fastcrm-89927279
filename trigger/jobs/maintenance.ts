import { schedules, logger } from '@trigger.dev/sdk/v3'
import { getSupabaseClient } from '../lib/supabase'

// Daily maintenance: runs at 03:00 UTC
export const dailyMaintenance = schedules.task({
  id: 'daily-maintenance',
  cron: '0 3 * * *',
  maxDuration: 300,
  run: async () => {
    const supabase = getSupabaseClient()
    logger.info('Daily maintenance started')

    const results = await Promise.allSettled([
      supabase.from('ai_agent_locks')
        .delete()
        .lt('expires_at', new Date().toISOString())
        .then(r => ({ task: 'clean_agent_locks', deleted: r.count ?? 0 })),

      supabase.from('ai_agent_memory')
        .delete()
        .eq('memory_type', 'cache')
        .lt('expires_at', new Date().toISOString())
        .then(r => ({ task: 'clean_agent_memory_cache', deleted: r.count ?? 0 })),

      supabase.from('voice_audio_cache')
        .delete()
        .lt('expires_at', new Date().toISOString())
        .then(r => ({ task: 'clean_voice_cache', deleted: r.count ?? 0 })),

      supabase.from('imo_market_insights')
        .delete()
        .eq('is_stale', true)
        .lt('created_at', new Date(Date.now() - 7 * 86400000).toISOString())
        .then(r => ({ task: 'clean_stale_imo_market', deleted: r.count ?? 0 })),

      supabase.from('imo_growth_insights')
        .delete()
        .eq('is_stale', true)
        .lt('created_at', new Date(Date.now() - 7 * 86400000).toISOString())
        .then(r => ({ task: 'clean_stale_imo_growth', deleted: r.count ?? 0 })),

      supabase.from('ai_usage_logs')
        .delete()
        .lt('created_at', new Date(Date.now() - 90 * 86400000).toISOString())
        .then(r => ({ task: 'clean_ai_usage_logs', deleted: r.count ?? 0 })),
    ])

    const summary = results.map((r, i) =>
      r.status === 'fulfilled' ? r.value : { task: `task_${i}`, error: 'failed' }
    )

    logger.info('Daily maintenance completed', { summary })
    return { summary }
  },
})

// Monthly budget reset: 1st of each month at 00:05 UTC
export const monthlyBudgetReset = schedules.task({
  id: 'monthly-budget-reset',
  cron: '5 0 1 * *',
  maxDuration: 60,
  run: async () => {
    const supabase = getSupabaseClient()
    logger.info('Monthly budget reset started')

    const { error } = await supabase.rpc('reset_monthly_ai_budgets')

    if (error) {
      logger.error('Budget reset failed', { error: error.message })
      throw error
    }

    logger.info('Monthly budget reset completed')
    return { success: true }
  },
})

// Weekly voice storage cleanup: Saturday at 04:00 UTC
export const weeklyVoiceStorageCleanup = schedules.task({
  id: 'weekly-voice-storage-cleanup',
  cron: '0 4 * * 6',
  maxDuration: 300,
  run: async () => {
    const supabase = getSupabaseClient()
    logger.info('Voice storage cleanup started')

    const { data: expiredEntries } = await supabase
      .from('voice_audio_cache')
      .select('id, storage_path')
      .lt('expires_at', new Date().toISOString())
      .not('storage_path', 'is', null)
      .limit(100)

    if (!expiredEntries?.length) {
      logger.info('No expired voice files to clean up')
      return { deleted: 0 }
    }

    const storagePaths = expiredEntries.map(e => e.storage_path)
    const { error: storageError } = await supabase.storage
      .from('voice-audio')
      .remove(storagePaths)

    if (storageError) {
      logger.error('Storage deletion failed', { error: storageError.message })
    }

    const ids = expiredEntries.map(e => e.id)
    await supabase.from('voice_audio_cache').delete().in('id', ids)

    logger.info('Voice storage cleanup completed', { deleted: expiredEntries.length })
    return { deleted: expiredEntries.length }
  },
})
