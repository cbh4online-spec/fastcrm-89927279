import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';

export interface PersuasionStructure {
  id: string;
  key: string;
  label: string;
  channel: string;
  blocks: Array<{ id: string; goal: string; required: boolean }>;
  constraints: { max_length?: number; cta_type?: string; tone_options?: string[] };
  length_profiles?: Record<string, Record<string, number>>;
  created_at: string;
  updated_at: string;
}

export interface StructureStats {
  id: string;
  workspace_id: string;
  channel: string;
  pipeline_stage: string | null;
  intent_label: string | null;
  structure_key: string;
  chosen_length: string | null;
  samples: number;
  opportunity_rate: number;
  win_rate: number;
  reply_rate: number;
  avg_time_to_reply_minutes: number;
  score: number;
  updated_at: string;
}

export function useStructures() {
  return useQuery({
    queryKey: ['persuasion-structures'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('persuasion_structures' as any)
        .select('*')
        .order('key');
      if (error) throw error;
      return (data || []) as unknown as PersuasionStructure[];
    },
  });
}

export function useStructureStats() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ['structure-stats', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const { data, error } = await supabase
        .from('workspace_structure_stats' as any)
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .order('score', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as StructureStats[];
    },
    enabled: !!currentWorkspace?.id,
  });
}

export function useLogStructureEvent() {
  return useMutation({
    mutationFn: async (params: {
      workspace_id: string;
      template_id: string;
      conversation_id?: string;
      message_id?: string;
      channel?: string;
      pipeline_stage?: string;
      intent_label?: string;
      sentiment_label?: string;
      lead_score?: number;
      potential_value?: number;
      structure_key: string;
      event_type: 'inserted' | 'sent' | 'replied' | 'opportunity_created' | 'deal_won';
    }) => {
      const { data, error } = await supabase.functions.invoke('structure-log-event', { body: params });
      if (error) throw error;
      return data;
    },
  });
}

export function usePredictBestStructure() {
  return useMutation({
    mutationFn: async (params: {
      workspace_id: string;
      channel?: string;
      pipeline_stage?: string;
      intent_label?: string;
      sentiment_label?: string;
      lead_score?: number;
      potential_value?: number;
      allowed_structures?: string[];
    }) => {
      const { data, error } = await supabase.functions.invoke('structure-predict-best', { body: params });
      if (error) throw error;
      return data as {
        success: boolean;
        best_structure_key: string;
        score: number;
        confidence: 'low' | 'medium' | 'high';
        rationale: string;
        exploration: boolean;
        alternatives: Array<{
          structure_key: string;
          score: number;
          samples: number;
          opportunity_rate: number;
          win_rate: number;
          reply_rate: number;
        }>;
        opportunity_rate: number;
        win_rate: number;
      };
    },
  });
}

export function useComposeMessage() {
  return useMutation({
    mutationFn: async (params: {
      template_id: string;
      workspace_id: string;
      channel?: string;
      lead_id?: string;
      contact_id?: string;
      conversation_id?: string;
      pipeline_stage?: string;
      intent_label?: string;
      sentiment_label?: string;
      lead_score?: number;
      potential_value?: number;
    }) => {
      const { data, error } = await supabase.functions.invoke('template-compose-message', { body: params });
      if (error) throw error;
      return data as {
        success: boolean;
        subject?: string;
        body: string;
        cta?: string;
        structure_key: string;
        block_map: Array<{ block_name: string; content: string }>;
        chosen_length: string;
        target_char_limit: number;
        char_count: number;
        confidence: 'low' | 'medium' | 'high';
        crm_variables_used: string[];
      };
    },
  });
}
