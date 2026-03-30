import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import { emitKernelEvent } from '@/lib/kernelEmitter';
import { useEffect } from 'react';

// ─── Types ───
export interface NextBestAction {
  id: string;
  workspace_id: string;
  entity_type: string;
  entity_id: string;
  action_type: string;
  title: string;
  description: string | null;
  rationale: string | null;
  priority_score: number;
  confidence: string;
  impact_estimate: number;
  urgency: string;
  due_at: string | null;
  status: string;
  source_signals_json: Record<string, unknown>;
  suggested_payload_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  acted_at: string | null;
  dismissed_at: string | null;
}

export interface NBASettings {
  id: string;
  workspace_id: string;
  is_enabled: boolean;
  refresh_interval_minutes: number;
  stale_context_threshold: number;
  min_priority_to_show: number;
  enable_auto_generation: boolean;
}

export interface NBALog {
  id: string;
  workspace_id: string;
  action_id: string;
  event_type: string;
  before_json: Record<string, unknown>;
  after_json: Record<string, unknown>;
  actor_type: string;
  actor_id: string | null;
  created_at: string;
}

// ─── Hooks ───

export function useNextBestActions(filters?: { status?: string; entity_type?: string; urgency?: string }) {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['next-best-actions', wid, filters],
    queryFn: async () => {
      if (!wid) return [];
      let q = supabase
        .from('next_best_actions' as any)
        .select('*')
        .eq('workspace_id', wid)
        .order('priority_score', { ascending: false })
        .limit(100);

      if (filters?.status) q = q.eq('status', filters.status);
      if (filters?.entity_type) q = q.eq('entity_type', filters.entity_type);
      if (filters?.urgency) q = q.eq('urgency', filters.urgency);

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as NextBestAction[];
    },
    enabled: !!wid,
  });

  // Realtime
  useEffect(() => {
    if (!wid) return;
    const channel = supabase
      .channel(`nba-rt-${wid}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'next_best_actions',
        filter: `workspace_id=eq.${wid}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['next-best-actions', wid] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [wid, queryClient]);

  return query;
}

export function useNBASettings() {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['nba-settings', wid],
    queryFn: async () => {
      if (!wid) return null;
      const { data, error } = await supabase
        .from('next_best_action_settings' as any)
        .select('*')
        .eq('workspace_id', wid)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as NBASettings | null;
    },
    enabled: !!wid,
  });

  const upsert = useMutation({
    mutationFn: async (updates: Partial<NBASettings>) => {
      if (!wid) throw new Error('No workspace');
      const { error } = await supabase
        .from('next_best_action_settings' as any)
        .upsert({ workspace_id: wid, ...updates, updated_at: new Date().toISOString() } as any, { onConflict: 'workspace_id' });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['nba-settings', wid] }),
  });

  return { settings: query.data, isLoading: query.isLoading, upsert };
}

export function useActOnNBA() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const wid = currentWorkspace?.id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (action: NextBestAction) => {
      if (!wid) throw new Error('No workspace');
      const now = new Date().toISOString();

      // Update status
      const { error } = await supabase
        .from('next_best_actions' as any)
        .update({ status: 'acted', acted_at: now, updated_at: now } as any)
        .eq('id', action.id);
      if (error) throw error;

      // Log
      await supabase.from('next_best_action_logs' as any).insert({
        workspace_id: wid,
        action_id: action.id,
        event_type: 'acted',
        before_json: { status: 'open' },
        after_json: { status: 'acted', acted_at: now },
        actor_type: 'user',
        actor_id: user?.id ?? null,
      } as any);

      // Kernel event
      emitKernelEvent({
        workspace_id: wid,
        type: 'NBA.ACTED',
        entity_kind: action.entity_type,
        entity_id: action.entity_id,
        source_module: 'next-best-action',
        payload: { action_type: action.action_type, action_id: action.id },
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['next-best-actions', wid] }),
  });
}

export function useDismissNBA() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const wid = currentWorkspace?.id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (action: NextBestAction) => {
      if (!wid) throw new Error('No workspace');
      const now = new Date().toISOString();

      const { error } = await supabase
        .from('next_best_actions' as any)
        .update({ status: 'dismissed', dismissed_at: now, updated_at: now } as any)
        .eq('id', action.id);
      if (error) throw error;

      await supabase.from('next_best_action_logs' as any).insert({
        workspace_id: wid,
        action_id: action.id,
        event_type: 'dismissed',
        before_json: { status: 'open' },
        after_json: { status: 'dismissed', dismissed_at: now },
        actor_type: 'user',
        actor_id: user?.id ?? null,
      } as any);

      emitKernelEvent({
        workspace_id: wid,
        type: 'NBA.DISMISSED',
        entity_kind: action.entity_type,
        entity_id: action.entity_id,
        source_module: 'next-best-action',
        payload: { action_type: action.action_type, action_id: action.id },
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['next-best-actions', wid] }),
  });
}

export function useNBAStats() {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;

  return useQuery({
    queryKey: ['nba-stats', wid],
    queryFn: async () => {
      if (!wid) return { open: 0, acted_today: 0, potential_revenue: 0, overdue: 0 };

      const { data: all } = await supabase
        .from('next_best_actions' as any)
        .select('status, impact_estimate, due_at, acted_at')
        .eq('workspace_id', wid)
        .in('status', ['open', 'acted']);

      const items = (all ?? []) as unknown as NextBestAction[];
      const now = new Date();
      const todayStr = now.toISOString().slice(0, 10);

      const open = items.filter(i => i.status === 'open').length;
      const acted_today = items.filter(i => i.status === 'acted' && i.acted_at?.slice(0, 10) === todayStr).length;
      const potential_revenue = items
        .filter(i => i.status === 'open')
        .reduce((sum, i) => sum + (Number(i.impact_estimate) || 0), 0);
      const overdue = items
        .filter(i => i.status === 'open' && i.due_at && new Date(i.due_at) < now).length;

      return { open, acted_today, potential_revenue, overdue };
    },
    enabled: !!wid,
    refetchInterval: 60_000,
  });
}

export function useNBALogs(actionId?: string) {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;

  return useQuery({
    queryKey: ['nba-logs', wid, actionId],
    queryFn: async () => {
      if (!wid) return [];
      let q = supabase
        .from('next_best_action_logs' as any)
        .select('*')
        .eq('workspace_id', wid)
        .order('created_at', { ascending: false })
        .limit(50);
      if (actionId) q = q.eq('action_id', actionId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as NBALog[];
    },
    enabled: !!wid,
  });
}

export function useGenerateNBAs() {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!wid) throw new Error('No workspace');
      const { data, error } = await supabase.functions.invoke('process-next-best-actions', {
        body: { workspace_id: wid },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['next-best-actions', wid] }),
  });
}
