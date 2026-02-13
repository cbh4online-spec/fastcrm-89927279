/**
 * Hooks for managing AI Agent goals: workflow triggers, transfer rules, handover config
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { toast } from 'sonner';

// ===================== Types =====================

export interface WorkflowTrigger {
  id: string;
  workspace_id: string;
  bot_id: string;
  workflow_id: string;
  action_name: string;
  trigger_condition_text: string;
  examples: string[] | null;
  is_active: boolean;
  created_at: string;
}

export interface TransferRule {
  id: string;
  workspace_id: string;
  from_bot_id: string;
  to_bot_id: string;
  trigger_condition_text: string;
  examples: string[] | null;
  is_active: boolean;
  created_at: string;
}

export interface ConversationAIState {
  id: string;
  conversation_id: string;
  active_bot_id: string | null;
  is_bot_sleeping: boolean;
  handed_over: boolean;
  fail_count: number;
  handover_reason: string | null;
}

// ===================== Workflow Triggers =====================

export function useWorkflowTriggers(botId: string | null) {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ['ai-workflow-triggers', currentWorkspace?.id, botId],
    queryFn: async () => {
      if (!currentWorkspace?.id || !botId) return [];
      const { data, error } = await supabase
        .from('ai_workflow_triggers')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .eq('bot_id', botId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as WorkflowTrigger[];
    },
    enabled: !!currentWorkspace?.id && !!botId,
  });
}

export function useCreateWorkflowTrigger() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (data: Omit<WorkflowTrigger, 'id' | 'workspace_id' | 'created_at'>) => {
      const { error } = await supabase
        .from('ai_workflow_triggers')
        .insert({ ...data, workspace_id: currentWorkspace!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ai-workflow-triggers'] });
      toast.success('Trigger criado');
    },
    onError: (e) => toast.error('Erro ao criar trigger', { description: (e as Error).message }),
  });
}

export function useDeleteWorkflowTrigger() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ai_workflow_triggers').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ai-workflow-triggers'] });
      toast.success('Trigger removido');
    },
  });
}

// ===================== Transfer Rules =====================

export function useTransferRules(botId: string | null) {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ['bot-transfer-rules', currentWorkspace?.id, botId],
    queryFn: async () => {
      if (!currentWorkspace?.id || !botId) return [];
      const { data, error } = await supabase
        .from('bot_transfer_rules')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .eq('from_bot_id', botId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as TransferRule[];
    },
    enabled: !!currentWorkspace?.id && !!botId,
  });
}

export function useCreateTransferRule() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (data: Omit<TransferRule, 'id' | 'workspace_id' | 'created_at'>) => {
      const { error } = await supabase
        .from('bot_transfer_rules')
        .insert({ ...data, workspace_id: currentWorkspace!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bot-transfer-rules'] });
      toast.success('Regra criada');
    },
    onError: (e) => toast.error('Erro ao criar regra', { description: (e as Error).message }),
  });
}

export function useDeleteTransferRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('bot_transfer_rules').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bot-transfer-rules'] });
      toast.success('Regra removida');
    },
  });
}

// ===================== Handover =====================

export function useHandover() {
  return useMutation({
    mutationFn: async (params: {
      workspaceId: string;
      conversationId: string;
      reason: string;
      assignToUserId?: string;
      closingMessage?: string;
      botId?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('human-handover', {
        body: params,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => toast.success('Handover realizado'),
    onError: (e) => toast.error('Erro no handover', { description: (e as Error).message }),
  });
}

// ===================== Bot Sleep/Wake =====================

export function useBotSleepWake() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      workspaceId: string;
      conversationId?: string;
      botId: string;
      action: 'sleep' | 'wake';
    }) => {
      if (params.action === 'wake' && params.conversationId) {
        const { error } = await supabase
          .from('conversation_ai_state')
          .update({
            is_bot_sleeping: false,
            handed_over: false,
            fail_count: 0,
            sleep_until: null,
            updated_at: new Date().toISOString(),
          })
          .eq('conversation_id', params.conversationId);
        if (error) throw error;
      }
      // Sleep handled by handover function
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['conversation-ai-state'] });
      toast.success(vars.action === 'wake' ? 'Bot reativado' : 'Bot em pausa');
    },
  });
}
