import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useEffect } from 'react';
import { toast } from 'sonner';

// ── Workspace State ──
export function useWorkspaceState() {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['workspace-state', wid],
    queryFn: async () => {
      if (!wid) return null;
      const { data, error } = await supabase
        .from('workspace_operating_state' as any)
        .select('*')
        .eq('workspace_id', wid)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
    enabled: !!wid,
  });

  useEffect(() => {
    if (!wid) return;
    const channel = supabase
      .channel(`ws-state-rt-${wid}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workspace_operating_state', filter: `workspace_id=eq.${wid}` },
        () => qc.invalidateQueries({ queryKey: ['workspace-state', wid] }))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [wid, qc]);

  return query;
}

// ── Missions ──
export function useWorkspaceMissions(statusFilter?: string[]) {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['workspace-missions', wid, statusFilter],
    queryFn: async () => {
      if (!wid) return [];
      let q = supabase.from('workspace_missions' as any).select('*').eq('workspace_id', wid).order('created_at', { ascending: false }).limit(50);
      if (statusFilter?.length) q = q.in('status', statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!wid,
  });

  useEffect(() => {
    if (!wid) return;
    const channel = supabase
      .channel(`ws-missions-rt-${wid}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workspace_missions', filter: `workspace_id=eq.${wid}` },
        () => qc.invalidateQueries({ queryKey: ['workspace-missions', wid] }))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [wid, qc]);

  return query;
}

// ── Alerts ──
export function useWorkspaceAlerts() {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['workspace-alerts', wid],
    queryFn: async () => {
      if (!wid) return [];
      const { data, error } = await supabase
        .from('workspace_alerts' as any)
        .select('*')
        .eq('workspace_id', wid)
        .in('status', ['open', 'acknowledged'])
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!wid,
  });

  useEffect(() => {
    if (!wid) return;
    const channel = supabase
      .channel(`ws-alerts-rt-${wid}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workspace_alerts', filter: `workspace_id=eq.${wid}` },
        () => qc.invalidateQueries({ queryKey: ['workspace-alerts', wid] }))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [wid, qc]);

  return query;
}

// ── Settings ──
export function useWorkspaceEngineSettings() {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['workspace-engine-settings', wid],
    queryFn: async () => {
      if (!wid) return null;
      const { data, error } = await supabase
        .from('workspace_engine_settings' as any)
        .select('*')
        .eq('workspace_id', wid)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
    enabled: !!wid,
  });

  const upsert = useMutation({
    mutationFn: async (values: Record<string, any>) => {
      if (!wid) throw new Error('No workspace');
      const { error } = await supabase.from('workspace_engine_settings' as any).upsert({
        workspace_id: wid,
        ...values,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'workspace_id' } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workspace-engine-settings', wid] });
      toast.success('Definições guardadas');
    },
  });

  return { ...query, upsert };
}

// ── Recalculate ──
export function useRecalculateWorkspace() {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!wid) throw new Error('No workspace');
      const { data, error } = await supabase.functions.invoke('process-workspace-engine', { body: { workspace_id: wid } });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workspace-state', wid] });
      qc.invalidateQueries({ queryKey: ['workspace-alerts', wid] });
      qc.invalidateQueries({ queryKey: ['workspace-missions', wid] });
      toast.success('Estado do workspace recalculado');
    },
    onError: (err) => toast.error(`Erro: ${(err as Error).message}`),
  });
}

// ── Execute Mission ──
export function useExecuteMission() {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (missionId: string) => {
      if (!wid) throw new Error('No workspace');
      const { data, error } = await supabase.functions.invoke('process-workspace-missions', {
        body: { workspace_id: wid, mission_id: missionId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workspace-missions', wid] });
      toast.success('Missão executada');
    },
    onError: (err) => toast.error(`Erro: ${(err as Error).message}`),
  });
}

// ── Resolve Mission ──
export function useResolveMission() {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (missionId: string) => {
      const { error } = await supabase.from('workspace_missions' as any)
        .update({ status: 'completed', completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', missionId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workspace-missions', wid] });
      toast.success('Missão concluída');
    },
  });
}

// ── Resolve Alert ──
export function useResolveAlert() {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase.from('workspace_alerts' as any)
        .update({ status: 'resolved', resolved_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', alertId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workspace-alerts', wid] });
      toast.success('Alerta resolvido');
    },
  });
}
