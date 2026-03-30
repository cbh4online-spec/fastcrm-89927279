import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { toast } from 'sonner';

export interface OptimizationRecommendation {
  id: string;
  workspace_id: string;
  entity_type: string;
  entity_id: string;
  recommendation_type: string;
  title: string;
  rationale: string | null;
  suggested_action_json: any;
  confidence: string;
  impact_estimate: number;
  status: string;
  auto_applicable: boolean;
  auto_applied: boolean;
  applied_at: string | null;
  dismissed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OptimizationActionLog {
  id: string;
  workspace_id: string;
  recommendation_id: string | null;
  action_type: string;
  target_entity_type: string;
  target_entity_id: string;
  before_json: any;
  after_json: any;
  applied_by: string;
  applied_mode: string;
  reverted_at: string | null;
  created_at: string;
}

export interface OptimizationSettings {
  id: string;
  workspace_id: string;
  is_enabled: boolean;
  auto_optimize_enabled: boolean;
  min_samples_threshold: number;
  min_score_delta: number;
  min_revenue_delta: number;
  optimization_window_days: number;
  allow_auto_pause: boolean;
  allow_auto_promote: boolean;
  allow_auto_switch_variant: boolean;
}

export function useOptimizationRecommendations(filters?: {
  status?: string;
  entity_type?: string;
  recommendation_type?: string;
  confidence?: string;
}) {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ['optimization-recommendations', currentWorkspace?.id, filters],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      let query = supabase
        .from('optimization_recommendations')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .order('created_at', { ascending: false });

      if (filters?.status) query = query.eq('status', filters.status);
      if (filters?.entity_type) query = query.eq('entity_type', filters.entity_type);
      if (filters?.recommendation_type) query = query.eq('recommendation_type', filters.recommendation_type);
      if (filters?.confidence) query = query.eq('confidence', filters.confidence);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as OptimizationRecommendation[];
    },
    enabled: !!currentWorkspace?.id,
  });
}

export function useOptimizationSettings() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['optimization-settings', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return null;
      const { data, error } = await supabase
        .from('optimization_settings')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .maybeSingle();
      if (error) throw error;
      return data as OptimizationSettings | null;
    },
    enabled: !!currentWorkspace?.id,
  });

  const upsert = useMutation({
    mutationFn: async (values: Partial<OptimizationSettings>) => {
      if (!currentWorkspace?.id) throw new Error('No workspace');
      const { error } = await supabase
        .from('optimization_settings')
        .upsert({ workspace_id: currentWorkspace.id, ...values }, { onConflict: 'workspace_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['optimization-settings'] });
      toast.success('Definições de otimização guardadas');
    },
    onError: () => toast.error('Erro ao guardar definições'),
  });

  return { settings: query.data, isLoading: query.isLoading, upsert };
}

export function useApplyRecommendation() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rec: OptimizationRecommendation) => {
      if (!currentWorkspace?.id) throw new Error('No workspace');
      const action = rec.suggested_action_json;
      let beforeState: any = null;
      let afterState: any = null;

      // Execute action based on type
      if ((rec.recommendation_type === 'pause_variant' || rec.recommendation_type === 'promote_variant') && action?.variant_id) {
        const newActive = rec.recommendation_type === 'promote_variant';
        const { data: before } = await supabase
          .from('communication_template_variants')
          .select('id, is_active, variant_key')
          .eq('id', action.variant_id)
          .maybeSingle();
        beforeState = before;
        await supabase
          .from('communication_template_variants')
          .update({ is_active: newActive })
          .eq('id', action.variant_id);
        afterState = { ...before, is_active: newActive };
      }

      // Update recommendation status
      await supabase
        .from('optimization_recommendations')
        .update({ status: 'applied', applied_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', rec.id);

      // Log the action
      await supabase.from('optimization_action_logs').insert({
        workspace_id: currentWorkspace.id,
        recommendation_id: rec.id,
        action_type: rec.recommendation_type,
        target_entity_type: rec.entity_type,
        target_entity_id: rec.entity_id,
        before_json: beforeState,
        after_json: afterState,
        applied_by: 'user',
        applied_mode: 'manual',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['optimization-recommendations'] });
      queryClient.invalidateQueries({ queryKey: ['optimization-action-logs'] });
      toast.success('Recomendação aplicada com sucesso');
    },
    onError: () => toast.error('Erro ao aplicar recomendação'),
  });
}

export function useDismissRecommendation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (recId: string) => {
      const { error } = await supabase
        .from('optimization_recommendations')
        .update({ status: 'dismissed', dismissed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', recId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['optimization-recommendations'] });
      toast.success('Recomendação ignorada');
    },
  });
}

export function useRevertAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (log: OptimizationActionLog) => {
      // Revert state
      if (log.before_json?.id && (log.action_type === 'pause_variant' || log.action_type === 'promote_variant')) {
        await supabase
          .from('communication_template_variants')
          .update({ is_active: log.before_json.is_active })
          .eq('id', log.before_json.id);
      }

      // Mark log as reverted
      await supabase
        .from('optimization_action_logs')
        .update({ reverted_at: new Date().toISOString() })
        .eq('id', log.id);

      // Reopen recommendation if linked
      if (log.recommendation_id) {
        await supabase
          .from('optimization_recommendations')
          .update({ status: 'open', applied_at: null, auto_applied: false, updated_at: new Date().toISOString() })
          .eq('id', log.recommendation_id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['optimization-recommendations'] });
      queryClient.invalidateQueries({ queryKey: ['optimization-action-logs'] });
      toast.success('Ação revertida com sucesso');
    },
    onError: () => toast.error('Erro ao reverter ação'),
  });
}

export function useOptimizationActionLogs() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ['optimization-action-logs', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const { data, error } = await supabase
        .from('optimization_action_logs')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []) as OptimizationActionLog[];
    },
    enabled: !!currentWorkspace?.id,
  });
}

export function useOptimizationStats() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ['optimization-stats', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return { open: 0, applied: 0, autoApplied: 0, estimatedUplift: 0 };

      const { data: recs } = await supabase
        .from('optimization_recommendations')
        .select('status, auto_applied, impact_estimate')
        .eq('workspace_id', currentWorkspace.id);

      const all = recs || [];
      const open = all.filter(r => r.status === 'open').length;
      const applied = all.filter(r => r.status === 'applied').length;
      const autoApplied = all.filter(r => r.auto_applied).length;
      const estimatedUplift = all
        .filter(r => r.status === 'open')
        .reduce((sum, r) => sum + (Number(r.impact_estimate) || 0), 0);

      return { open, applied, autoApplied, estimatedUplift };
    },
    enabled: !!currentWorkspace?.id,
  });
}
