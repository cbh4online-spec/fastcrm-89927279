import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';

export interface LeadBehaviorSignals {
  id: string;
  workspace_id: string;
  contact_id: string | null;
  lead_id: string | null;
  channel_preference: string | null;
  response_latency_avg_minutes: number;
  reply_rate_last_30d: number;
  followup_needed_rate: number;
  reading_proxy_score: number;
  engagement_depth_score: number;
  last_seen_at: string | null;
  last_updated_at: string;
}

export interface LengthPrediction {
  success: boolean;
  chosen_length: 'short' | 'medium' | 'long';
  target_char_limit: number;
  confidence: 'low' | 'medium' | 'high';
  rationale: string;
  exploration: boolean;
  signals_used: boolean;
  length_scores: Record<string, { score: number; samples: number }>;
}

export function useLeadBehaviorSignals(contactId?: string, leadId?: string) {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ['lead-behavior-signals', currentWorkspace?.id, contactId, leadId],
    queryFn: async () => {
      if (!currentWorkspace?.id) return null;
      let query = supabase
        .from('lead_behavior_signals' as any)
        .select('*')
        .eq('workspace_id', currentWorkspace.id);
      if (contactId) query = query.eq('contact_id', contactId);
      else if (leadId) query = query.eq('lead_id', leadId);
      else return null;
      const { data, error } = await query.limit(1).single();
      if (error) return null;
      return data as unknown as LeadBehaviorSignals;
    },
    enabled: !!currentWorkspace?.id && !!(contactId || leadId),
  });
}

export function useComputeSignals() {
  return useMutation({
    mutationFn: async (params: { workspace_id: string; contact_id?: string; lead_id?: string }) => {
      const { data, error } = await supabase.functions.invoke('compute-lead-behavior-signals', { body: params });
      if (error) throw error;
      return data;
    },
  });
}

export function usePredictLength() {
  return useMutation({
    mutationFn: async (params: {
      workspace_id: string;
      structure_key: string;
      channel?: string;
      pipeline_stage?: string;
      intent_label?: string;
      contact_id?: string;
      lead_id?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('predict-optimal-length', { body: params });
      if (error) throw error;
      return data as LengthPrediction;
    },
  });
}

export function useLogLengthEvent() {
  return useMutation({
    mutationFn: async (params: {
      workspace_id: string;
      conversation_id?: string;
      template_id?: string;
      structure_key: string;
      channel?: string;
      pipeline_stage?: string;
      intent_label?: string;
      chosen_length: string;
      char_count: number;
      event_type: 'composed' | 'sent' | 'replied' | 'opportunity_created' | 'deal_won';
    }) => {
      const { data, error } = await supabase.functions.invoke('length-log-event', { body: params });
      if (error) throw error;
      return data;
    },
  });
}

export function useStructureLengthStats() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ['structure-length-stats', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const { data, error } = await supabase
        .from('workspace_structure_stats' as any)
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .not('chosen_length', 'is', null)
        .order('score', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as Array<{
        id: string;
        structure_key: string;
        channel: string;
        chosen_length: string;
        samples: number;
        opportunity_rate: number;
        win_rate: number;
        reply_rate: number;
        score: number;
      }>;
    },
    enabled: !!currentWorkspace?.id,
  });
}
