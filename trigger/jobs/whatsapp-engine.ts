import { schedules, logger } from '@trigger.dev/sdk/v3'
import { getSupabaseClient, invokeEdgeFunction } from '../lib/supabase'

/**
 * Motor de conversão WhatsApp: recalcula a Próxima Melhor Ação de cada
 * workspace que já tenha playbook ativo. Corre de 30 em 30 minutos.
 */
export const whatsappEngineRecommend = schedules.task({
  id: 'whatsapp-engine-recommend',
  cron: '*/30 * * * *',
  maxDuration: 900,
  run: async () => {
    const supabase = getSupabaseClient()

    const { data, error } = await supabase
      .from('whatsapp_template_playbook')
      .select('workspace_id')
      .eq('is_active', true)

    if (error) throw new Error(`Falha a listar playbooks: ${error.message}`)

    const workspaceIds = Array.from(new Set((data ?? []).map((r: any) => r.workspace_id)))
    logger.info('Motor WhatsApp: workspaces elegíveis', { count: workspaceIds.length })

    const results: Array<{ workspace_id: string; ok: boolean; error?: string }> = []

    for (const workspaceId of workspaceIds) {
      try {
        await invokeEdgeFunction('whatsapp-engine-recommend', {
          workspace_id: workspaceId,
          lead_ids: [],
          limit: 200,
        })
        results.push({ workspace_id: workspaceId, ok: true })
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e)
        logger.error('Motor WhatsApp falhou num workspace', { workspaceId, message })
        results.push({ workspace_id: workspaceId, ok: false, error: message })
      }
    }

    return { processed: results.length, failed: results.filter((r) => !r.ok).length }
  },
})
