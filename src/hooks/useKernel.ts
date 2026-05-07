import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { toast } from 'sonner';

export function useKernelOverview() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  return useQuery({
    queryKey: ['kernel-overview', workspaceId],
    enabled: !!workspaceId,
    refetchInterval: 30_000,
    queryFn: async () => {
      const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      const [eventsToday, failed, decisions, impacts, nodes, edges, registry] = await Promise.all([
        supabase.from('kernel_events').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).gte('created_at', since),
        supabase.from('kernel_events').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).eq('status', 'failed'),
        supabase.from('kernel_decisions').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).gte('created_at', since),
        supabase.from('kernel_change_impacts').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).eq('status', 'open'),
        supabase.from('kernel_context_nodes').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId),
        supabase.from('kernel_context_edges').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId),
        supabase.from('kernel_event_registry' as any).select('id', { count: 'exact', head: true }),
      ]);
      return {
        eventsToday: eventsToday.count ?? 0,
        failed: failed.count ?? 0,
        decisions: decisions.count ?? 0,
        impacts: impacts.count ?? 0,
        nodes: nodes.count ?? 0,
        edges: edges.count ?? 0,
        registry: registry.count ?? 0,
      };
    },
  });
}

export function useEventRegistryFull() {
  return useQuery({
    queryKey: ['kernel-event-registry-full'],
    queryFn: async () => {
      const { data, error } = await supabase.from('kernel_event_registry' as any).select('*').order('domain').order('event_type');
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useEventStream(filters?: { eventType?: string; status?: string; limit?: number }) {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['kernel-event-stream', workspaceId, filters],
    enabled: !!workspaceId,
    queryFn: async () => {
      let q = supabase.from('kernel_events')
        .select('id,event_name,type,entity_kind,entity_id,severity,status,source_module,category,domain,correlation_id,created_at,occurred_at,payload')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(filters?.limit ?? 100);
      if (filters?.eventType) q = q.eq('event_name', filters.eventType);
      if (filters?.status) q = q.eq('status', filters.status);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    if (!workspaceId) return;
    const ch = supabase.channel(`kernel-events-stream-${workspaceId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'kernel_events', filter: `workspace_id=eq.${workspaceId}` },
        () => qc.invalidateQueries({ queryKey: ['kernel-event-stream', workspaceId] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [workspaceId, qc]);

  return query;
}

export function useDecisionRules() {
  return useQuery({
    queryKey: ['kernel-decision-rules'],
    queryFn: async () => {
      const { data, error } = await supabase.from('kernel_decision_rules' as any).select('*').order('priority', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useChangeImpacts() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ['kernel-change-impacts', workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase.from('kernel_change_impacts' as any).select('*').eq('workspace_id', workspaceId).order('created_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const update: any = { status };
      if (status === 'resolved') update.resolved_at = new Date().toISOString();
      const { error } = await supabase.from('kernel_change_impacts' as any).update(update).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kernel-change-impacts'] });
      toast.success('Impacto atualizado');
    },
  });

  return { ...list, updateStatus };
}

export function useContextGraph(entityType?: string, entityId?: string) {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  return useQuery({
    queryKey: ['kernel-context-graph', workspaceId, entityType, entityId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const nodes = await supabase.from('kernel_context_nodes').select('*').eq('workspace_id', workspaceId).limit(50);
      const edges = await supabase.from('kernel_context_edges').select('*').eq('workspace_id', workspaceId).limit(100);
      return { nodes: nodes.data ?? [], edges: edges.data ?? [] };
    },
  });
}

export function useAuditLogs() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  return useQuery({
    queryKey: ['kernel-audit-logs', workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase.from('kernel_audit_logs' as any).select('*').eq('workspace_id', workspaceId).order('created_at', { ascending: false }).limit(100);
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useKernelDiagnostics() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  return useQuery({
    queryKey: ['kernel-diagnostics', workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('kernel-diagnostics', { body: { workspace_id: workspaceId } });
      if (error) throw error;
      return data;
    },
  });
}

export function useEntityTimeline(entityType?: string, entityId?: string) {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  return useQuery({
    queryKey: ['kernel-entity-timeline', workspaceId, entityType, entityId],
    enabled: !!workspaceId && !!entityType && !!entityId,
    queryFn: async () => {
      const { data, error } = await supabase.from('kernel_entity_timeline' as any)
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('occurred_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useDecisionsList() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  return useQuery({
    queryKey: ['kernel-decisions-list', workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase.from('kernel_decisions').select('*').eq('workspace_id', workspaceId).order('created_at', { ascending: false }).limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });
}
