import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import type { AIAgentJob, AgentRegistryEntry, AgentSystemStats, CreateAgentJobRequest } from '@/types/ai-agents'

export function useAgentRegistry() {
  const { currentWorkspace } = useWorkspace()
  const workspaceId = currentWorkspace?.id

  return useQuery({
    queryKey: ['agent-registry', workspaceId],
    queryFn: async (): Promise<AgentRegistryEntry[]> => {
      const { data } = await supabase
        .from('ai_agent_registry')
        .select('*')
        .or(`workspace_id.is.null,workspace_id.eq.${workspaceId}`)
        .order('is_system', { ascending: false })
      return (data ?? []) as unknown as AgentRegistryEntry[]
    },
    enabled: !!workspaceId,
    staleTime: 300_000,
  })
}

export function useAIAgentJobs(filters?: { status?: string; agent_type?: string }) {
  const { currentWorkspace } = useWorkspace()
  const workspaceId = currentWorkspace?.id

  return useQuery({
    queryKey: ['ai-agent-jobs', workspaceId, filters],
    queryFn: async (): Promise<AIAgentJob[]> => {
      let query = supabase
        .from('ai_agent_jobs')
        .select('*')
        .eq('workspace_id', workspaceId!)
        .order('created_at', { ascending: false })
        .limit(100)
      if (filters?.status) query = query.eq('status', filters.status as any)
      if (filters?.agent_type) query = query.eq('agent_type', filters.agent_type)
      const { data } = await query
      return (data ?? []) as unknown as AIAgentJob[]
    },
    enabled: !!workspaceId,
    staleTime: 5_000,
    refetchInterval: 8_000,
  })
}

export function useAgentJob(jobId: string | undefined) {
  const { currentWorkspace } = useWorkspace()
  const workspaceId = currentWorkspace?.id

  return useQuery({
    queryKey: ['ai-agent-job', jobId],
    queryFn: async () => {
      const { data } = await supabase
        .from('ai_agent_jobs')
        .select('*')
        .eq('id', jobId!)
        .single()
      return data as unknown as AIAgentJob
    },
    enabled: !!jobId && !!workspaceId,
    refetchInterval: (q) => {
      const status = (q.state.data as AIAgentJob | undefined)?.status
      return ['pending', 'queued', 'running'].includes(status ?? '') ? 3_000 : false
    },
  })
}

export function useAgentSystemStats() {
  const { currentWorkspace } = useWorkspace()
  const workspaceId = currentWorkspace?.id
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const { data, isLoading } = useQuery({
    queryKey: ['agent-system-stats', workspaceId],
    queryFn: async (): Promise<AgentSystemStats> => {
      const [pending, running, completedToday, failedToday, schedules, memory] = await Promise.all([
        supabase.from('ai_agent_jobs').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId!).eq('status', 'pending' as any),
        supabase.from('ai_agent_jobs').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId!).eq('status', 'running' as any),
        supabase.from('ai_agent_jobs').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId!).eq('status', 'completed' as any).gte('completed_at', today.toISOString()),
        supabase.from('ai_agent_jobs').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId!).eq('status', 'failed' as any).gte('completed_at', today.toISOString()),
        supabase.from('ai_agent_schedules').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId!).eq('is_active', true),
        supabase.from('ai_agent_memory').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId!),
      ])

      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString()
      const { data: recent } = await supabase
        .from('ai_agent_jobs')
        .select('status')
        .eq('workspace_id', workspaceId!)
        .gte('completed_at', sevenDaysAgo)
        .in('status', ['completed', 'failed'] as any)
      const total7d = recent?.length ?? 0
      const success7d = recent?.filter(j => j.status === 'completed').length ?? 0

      return {
        pending_jobs: pending.count ?? 0,
        running_jobs: running.count ?? 0,
        completed_today: completedToday.count ?? 0,
        failed_today: failedToday.count ?? 0,
        active_schedules: schedules.count ?? 0,
        total_memory_entries: memory.count ?? 0,
        total_tokens_today: 0,
        success_rate_7d: total7d > 0 ? Math.round((success7d / total7d) * 100) : 100,
      }
    },
    enabled: !!workspaceId,
    staleTime: 30_000,
    refetchInterval: 30_000,
  })
  return { data: data ?? null, isLoading }
}

export function useCreateAgentJob() {
  const qc = useQueryClient()
  const { currentWorkspace } = useWorkspace()
  const workspaceId = currentWorkspace?.id

  return useMutation({
    mutationFn: async (req: CreateAgentJobRequest) => {
      const { data, error } = await supabase.functions.invoke('ai-agent-orchestrator', {
        body: { workspace_id: workspaceId, create_job: { ...req, workspace_id: workspaceId } },
      })
      if (error) throw error
      return data as { job_id: string; dispatched_to: string }
    },
    onSuccess: () => {
      setTimeout(() => {
        qc.invalidateQueries({ queryKey: ['ai-agent-jobs', workspaceId] })
        qc.invalidateQueries({ queryKey: ['agent-system-stats', workspaceId] })
      }, 500)
    },
  })
}

export function useCancelAgentJob() {
  const qc = useQueryClient()
  const { currentWorkspace } = useWorkspace()
  const workspaceId = currentWorkspace?.id

  return useMutation({
    mutationFn: async (jobId: string) => {
      await supabase.from('ai_agent_jobs').update({
        status: 'cancelled' as any,
        completed_at: new Date().toISOString(),
      }).eq('id', jobId).eq('workspace_id', workspaceId!)
      await supabase.from('ai_agent_locks').delete().eq('job_id', jobId)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ai-agent-jobs', workspaceId] }),
  })
}
