import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useEffect } from 'react';
import { toast } from 'sonner';

// ── Types ──
interface MemoryFilters {
  memory_type?: string;
  validity_status?: string;
  limit?: number;
}

// ── Memories ──
export function useWorkspaceMemories(filters?: MemoryFilters) {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['workspace-memories', wid, filters],
    queryFn: async () => {
      if (!wid) return [];
      let q = supabase
        .from('workspace_memories')
        .select('*')
        .eq('workspace_id', wid)
        .order('updated_at', { ascending: false })
        .limit(filters?.limit ?? 100);

      if (filters?.memory_type) q = q.eq('memory_type', filters.memory_type);
      if (filters?.validity_status) q = q.eq('validity_status', filters.validity_status);

      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!wid,
  });

  // Realtime
  useEffect(() => {
    if (!wid) return;
    const channel = supabase
      .channel(`memories-rt-${wid}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workspace_memories', filter: `workspace_id=eq.${wid}` },
        () => queryClient.invalidateQueries({ queryKey: ['workspace-memories', wid] }))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [wid, queryClient]);

  return query;
}

// ── Stats ──
export function useMemoryStats() {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;

  return useQuery({
    queryKey: ['memory-stats', wid],
    queryFn: async () => {
      if (!wid) return null;
      const { data, error } = await supabase
        .from('workspace_memories')
        .select('memory_type, confidence, validity_status, importance_score')
        .eq('workspace_id', wid)
        .in('validity_status', ['valid', 'aging']);

      if (error) throw error;
      const memories = data ?? [];
      const total = memories.length;
      const avgConfidence = total > 0 ? memories.reduce((s, m) => s + Number(m.confidence || 0), 0) / total : 0;
      const byType: Record<string, number> = {};
      memories.forEach(m => { byType[m.memory_type] = (byType[m.memory_type] || 0) + 1; });
      const successCount = byType['success_pattern'] || 0;
      const failureCount = byType['failure_pattern'] || 0;

      return { total, avgConfidence, byType, successCount, failureCount };
    },
    enabled: !!wid,
  });
}

// ── Settings ──
export function useMemorySettings() {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['memory-settings', wid],
    queryFn: async () => {
      if (!wid) return null;
      const { data } = await supabase
        .from('memory_settings')
        .select('*')
        .eq('workspace_id', wid)
        .maybeSingle();
      return data;
    },
    enabled: !!wid,
  });

  const upsert = useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      if (!wid) throw new Error('No workspace');
      const { error } = await supabase
        .from('memory_settings')
        .upsert({ workspace_id: wid, ...updates, updated_at: new Date().toISOString() }, { onConflict: 'workspace_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memory-settings', wid] });
      toast.success('Definições de memória atualizadas');
    },
  });

  return { ...query, upsert };
}

// ── Trigger Learning Cycle ──
export function useTriggerLearningCycle() {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!wid) throw new Error('No workspace');
      const { data, error } = await supabase.functions.invoke('process-workspace-memory', {
        body: { workspace_id: wid },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['workspace-memories', wid] });
      queryClient.invalidateQueries({ queryKey: ['memory-stats', wid] });
      queryClient.invalidateQueries({ queryKey: ['learning-cycles', wid] });
      toast.success(`Ciclo concluído: ${data?.memories_created || 0} novas memórias, ${data?.memories_updated || 0} reforçadas`);
    },
    onError: (err: any) => toast.error(err.message || 'Erro ao processar memória'),
  });
}

// ── Learning Cycles ──
export function useLearningCycles() {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;

  return useQuery({
    queryKey: ['learning-cycles', wid],
    queryFn: async () => {
      if (!wid) return [];
      const { data, error } = await supabase
        .from('workspace_learning_cycles')
        .select('*')
        .eq('workspace_id', wid)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!wid,
  });
}

// ── Log Memory Usage ──
export function useLogMemoryUsage() {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;

  return useMutation({
    mutationFn: async (params: { memory_id: string; used_by_type: string; used_by_id: string; outcome_quality?: string }) => {
      if (!wid) throw new Error('No workspace');
      const { error } = await supabase.from('memory_usage_logs').insert({
        workspace_id: wid,
        memory_id: params.memory_id,
        used_by_type: params.used_by_type,
        used_by_id: params.used_by_id,
        outcome_quality: params.outcome_quality || 'neutral',
      });
      if (error) throw error;

      // Increment reuse count and update last_used_at
      await supabase.rpc('increment_memory_reuse', { p_memory_id: params.memory_id }).catch(() => {
        // Fallback: direct update if RPC doesn't exist
        supabase.from('workspace_memories')
          .update({ reuse_count: supabase.rpc ? undefined : 1, last_used_at: new Date().toISOString() })
          .eq('id', params.memory_id);
      });
    },
  });
}
