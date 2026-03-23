import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import type { AIAgentExecution, AIAgentMemory, AIAgentSchedule } from '@/types/ai-agents'

export function useAIAgentExecutions(jobId: string | undefined) {
  return useQuery({
    queryKey: ['ai-agent-executions', jobId],
    queryFn: async (): Promise<AIAgentExecution[]> => {
      const { data } = await supabase
        .from('ai_agent_executions')
        .select('*')
        .eq('job_id', jobId!)
        .order('step_number', { ascending: true })
      return (data ?? []) as unknown as AIAgentExecution[]
    },
    enabled: !!jobId,
    staleTime: 2_000,
    refetchInterval: 3_000,
  })
}

export function useAgentMemory(agentType: string | undefined) {
  const { currentWorkspace } = useWorkspace()
  const workspaceId = currentWorkspace?.id

  return useQuery({
    queryKey: ['agent-memory', workspaceId, agentType],
    queryFn: async (): Promise<AIAgentMemory[]> => {
      let query = supabase.from('ai_agent_memory').select('*')
        .eq('workspace_id', workspaceId!)
        .order('importance', { ascending: false }).limit(50)
      if (agentType) query = query.eq('agent_type', agentType)
      const { data } = await query
      return (data ?? []) as unknown as AIAgentMemory[]
    },
    enabled: !!workspaceId,
    staleTime: 30_000,
  })
}

export function useAgentSchedules() {
  const { currentWorkspace } = useWorkspace()
  const workspaceId = currentWorkspace?.id

  return useQuery({
    queryKey: ['agent-schedules', workspaceId],
    queryFn: async (): Promise<AIAgentSchedule[]> => {
      const { data } = await supabase.from('ai_agent_schedules').select('*')
        .eq('workspace_id', workspaceId!).order('created_at', { ascending: false })
      return (data ?? []) as unknown as AIAgentSchedule[]
    },
    enabled: !!workspaceId,
    staleTime: 30_000,
  })
}
