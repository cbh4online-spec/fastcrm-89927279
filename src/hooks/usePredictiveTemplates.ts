import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';

// --- Variants ---

export interface TemplateVariant {
  id: string;
  workspace_id: string;
  template_id: string;
  variant_key: string;
  channel: string;
  subject?: string;
  body: string;
  cta?: string;
  tone: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useTemplateVariants(templateId?: string) {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ['template-variants', templateId, currentWorkspace?.id],
    queryFn: async () => {
      if (!templateId || !currentWorkspace?.id) return [];
      const { data, error } = await supabase
        .from('communication_template_variants' as any)
        .select('*')
        .eq('template_id', templateId)
        .eq('workspace_id', currentWorkspace.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as TemplateVariant[];
    },
    enabled: !!templateId && !!currentWorkspace?.id,
  });
}

export function useCreateVariant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (variant: Omit<TemplateVariant, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('communication_template_variants' as any)
        .insert(variant as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['template-variants'] }),
  });
}

// --- Usage Events ---

export function useLogTemplateEvent() {
  return useMutation({
    mutationFn: async (params: {
      workspace_id: string;
      template_id: string;
      variant_id?: string;
      conversation_id?: string;
      message_id?: string;
      channel?: string;
      pipeline_stage?: string;
      lead_id?: string;
      contact_id?: string;
      company_id?: string;
      intent_label?: string;
      sentiment_label?: string;
      lead_score?: number;
      potential_value?: number;
      event_type: 'inserted' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'replied' | 'opportunity_created' | 'deal_won';
    }) => {
      const { data, error } = await supabase.functions.invoke('template-log-event', { body: params });
      if (error) throw error;
      return data;
    },
  });
}

// --- Stats ---

export function useWorkspaceTemplateStats(templateId?: string) {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ['workspace-template-stats', currentWorkspace?.id, templateId],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      let query = supabase
        .from('workspace_template_stats' as any)
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .order('score', { ascending: false });
      if (templateId) query = query.eq('template_id', templateId);
      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as Array<{
        id: string;
        workspace_id: string;
        template_id: string;
        variant_id: string | null;
        channel: string;
        pipeline_stage: string | null;
        industry: string | null;
        tone: string | null;
        samples: number;
        reply_rate: number;
        opportunity_rate: number;
        win_rate: number;
        avg_time_to_reply_minutes: number;
        score: number;
        updated_at: string;
      }>;
    },
    enabled: !!currentWorkspace?.id,
  });
}

// --- Predict Best Variant ---

export function usePredictBestVariant() {
  return useMutation({
    mutationFn: async (params: {
      workspace_id: string;
      template_id: string;
      channel?: string;
      pipeline_stage?: string;
      industry?: string;
      lead_score?: number;
      intent_label?: string;
      sentiment_label?: string;
      potential_value?: number;
    }) => {
      const { data, error } = await supabase.functions.invoke('template-predict-best-variant', { body: params });
      if (error) throw error;
      return data as {
        success: boolean;
        variant_id: string | null;
        variant_key: string;
        score: number;
        confidence: 'low' | 'medium' | 'high';
        rationale: string;
        exploration: boolean;
        alternatives: Array<{
          variant_id: string;
          variant_key: string;
          score: number;
          samples: number;
          reply_rate: number;
        }>;
      };
    },
  });
}

// --- Predictive Rewrite ---

export function usePredictiveCopy() {
  return useMutation({
    mutationFn: async (params: {
      workspace_id: string;
      variant_id?: string;
      template_id?: string;
      channel?: string;
      lead_id?: string;
      contact_id?: string;
      crm_variables?: Record<string, string>;
      smart_variables?: Record<string, string>;
      intent_label?: string;
      generate_alternatives?: boolean;
    }) => {
      const { data, error } = await supabase.functions.invoke('template-generate-predictive-copy', { body: params });
      if (error) throw error;
      return data as {
        success: boolean;
        subject?: string;
        body: string;
        cta?: string;
        alternatives?: Array<{ subject?: string; body: string; cta?: string }>;
      };
    },
  });
}
