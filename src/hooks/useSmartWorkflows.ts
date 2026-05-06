import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { toast } from 'sonner';

export type AutomationRule = {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  category: string | null;
  trigger_type: string;
  trigger_event: string | null;
  conditions_logic: 'all' | 'any';
  conditions: Array<{ field: string; operator: string; value: unknown }>;
  actions: Array<{ action_type: string; config: Record<string, unknown> }>;
  is_active: boolean;
  cooldown_minutes: number;
  max_runs_per_day: number | null;
  max_runs_per_entity_per_day: number | null;
  require_human_approval: boolean;
  last_run_at: string | null;
  run_count: number;
  created_at: string;
  updated_at: string;
};

export type AutomationTemplate = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  trigger_event: string;
  conditions: AutomationRule['conditions'];
  actions: AutomationRule['actions'];
  system_template: boolean;
  icon: string | null;
};

export type AutomationLog = {
  id: string;
  workspace_id: string;
  rule_id: string | null;
  automation_id: string;
  automation_name: string | null;
  entity_type: string;
  entity_id: string;
  trigger_type: string;
  trigger_data: Record<string, unknown>;
  status: string;
  error_message: string | null;
  conditions_result: Record<string, unknown>;
  actions_executed: Array<Record<string, unknown>>;
  executed_at: string;
  duration_ms: number | null;
  depth: number;
  dry_run: boolean;
};

export type AutomationApproval = {
  id: string;
  workspace_id: string;
  rule_id: string | null;
  rule_run_id: string | null;
  action_type: string;
  proposed_payload: Record<string, unknown>;
  entity_type: string | null;
  entity_id: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  approved_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  created_at: string;
};

export function useSmartWorkflows() {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;

  return useQuery({
    queryKey: ['smart-workflows', wid],
    enabled: !!wid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('journey_automations')
        .select('*')
        .eq('workspace_id', wid!)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as AutomationRule[];
    },
  });
}

export function useAutomationTemplates() {
  return useQuery({
    queryKey: ['automation-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('automation_templates')
        .select('*')
        .eq('system_template', true)
        .order('category');
      if (error) throw error;
      return (data ?? []) as unknown as AutomationTemplate[];
    },
  });
}

export function useAutomationLogs(ruleId?: string) {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;

  return useQuery({
    queryKey: ['automation-logs', wid, ruleId],
    enabled: !!wid,
    queryFn: async () => {
      let q = supabase
        .from('journey_automation_logs')
        .select('*')
        .eq('workspace_id', wid!)
        .order('executed_at', { ascending: false })
        .limit(200);
      if (ruleId) q = q.eq('rule_id', ruleId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as AutomationLog[];
    },
    refetchInterval: 30_000,
  });
}

export function useAutomationApprovals() {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;

  return useQuery({
    queryKey: ['automation-approvals', wid],
    enabled: !!wid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('automation_action_approvals')
        .select('*')
        .eq('workspace_id', wid!)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as unknown as AutomationApproval[];
    },
    refetchInterval: 30_000,
  });
}

export function useToggleAutomation() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('journey_automations').update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['smart-workflows', currentWorkspace?.id] });
      toast.success('Automação atualizada');
    },
    onError: (e) => toast.error('Erro: ' + (e as Error).message),
  });
}

export function useDeleteAutomation() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('journey_automations').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['smart-workflows', currentWorkspace?.id] });
      toast.success('Automação removida');
    },
  });
}

export function useUpsertAutomation() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (rule: Partial<AutomationRule> & { name: string; trigger_event: string }) => {
      const { data: u } = await supabase.auth.getUser();
      const payload = {
        ...rule,
        workspace_id: currentWorkspace!.id,
        trigger_type: rule.trigger_type ?? rule.trigger_event,
        conditions: rule.conditions ?? [],
        actions: rule.actions ?? [],
        conditions_logic: rule.conditions_logic ?? 'all',
        cooldown_minutes: rule.cooldown_minutes ?? 0,
        require_human_approval: rule.require_human_approval ?? false,
        is_active: rule.is_active ?? false,
        created_by: rule.id ? undefined : u.user?.id,
        updated_by: u.user?.id,
      };
      if (rule.id) {
        const { error } = await supabase.from('journey_automations').update(payload as never).eq('id', rule.id);
        if (error) throw error;
        return rule.id;
      } else {
        const { data, error } = await supabase.from('journey_automations').insert(payload as never).select('id').maybeSingle();
        if (error) throw error;
        return data?.id;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['smart-workflows', currentWorkspace?.id] });
      toast.success('Automação guardada');
    },
    onError: (e) => toast.error('Erro: ' + (e as Error).message),
  });
}

export function useTestAutomation() {
  return useMutation({
    mutationFn: async (input: {
      workspace_id: string;
      rule_id_override?: string;
      event_type: string;
      entity_type?: string;
      entity_id?: string;
      conversation_id?: string;
      payload?: Record<string, unknown>;
    }) => {
      const { data, error } = await supabase.functions.invoke('automation-execute-rule', {
        body: { ...input, dry_run: true },
      });
      if (error) throw error;
      return data;
    },
  });
}

export function useApproveAutomationAction() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'approve' | 'reject'; reason?: string }) => {
      const { data: u } = await supabase.auth.getUser();
      const update = action === 'approve'
        ? { status: 'approved', approved_at: new Date().toISOString(), approved_by: u.user?.id }
        : { status: 'rejected', rejected_at: new Date().toISOString(), approved_by: u.user?.id };
      const { error } = await supabase.from('automation_action_approvals').update(update).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['automation-approvals', currentWorkspace?.id] });
      toast.success('Ação atualizada');
    },
  });
}

export function useRunScheduledChecks() {
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('automation-run-scheduled-checks', { body: {} });
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => toast.success(`Verificações concluídas: ${JSON.stringify(d?.stats ?? {})}`),
    onError: (e) => toast.error('Erro: ' + (e as Error).message),
  });
}

// Catálogo de triggers e ações disponíveis
export const TRIGGER_CATALOG = [
  { value: 'whatsapp.message.received', label: 'Mensagem WhatsApp recebida', category: 'whatsapp' },
  { value: 'whatsapp.audio.received', label: 'Áudio recebido', category: 'whatsapp' },
  { value: 'whatsapp.audio.transcribed', label: 'Áudio transcrito', category: 'whatsapp' },
  { value: 'whatsapp.product.shared', label: 'Produto partilhado', category: 'whatsapp' },
  { value: 'whatsapp.conversation.assigned', label: 'Conversa atribuída', category: 'whatsapp' },
  { value: 'whatsapp.conversation.resolved', label: 'Conversa resolvida', category: 'whatsapp' },
  { value: 'whatsapp.conversation.urgent_detected', label: 'Conversa urgente detectada', category: 'whatsapp' },
  { value: 'whatsapp.conversation.objection_detected', label: 'Objeção detectada', category: 'quality' },
  { value: 'whatsapp.conversation.analyzed', label: 'Conversa analisada (IA)', category: 'whatsapp' },
  { value: 'communication.appointment.created', label: 'Agendamento criado', category: 'appointment' },
  { value: 'communication.appointment.no_show', label: 'No-show de agendamento', category: 'appointment' },
  { value: 'communication.followup.created', label: 'Follow-up criado', category: 'followup' },
  { value: 'communication.followup.overdue', label: 'Follow-up vencido', category: 'followup' },
  { value: 'communication.conversation.unanswered', label: 'Conversa sem resposta', category: 'team' },
  { value: 'support.ticket.created', label: 'Ticket criado', category: 'support' },
  { value: 'support.ticket.escalated', label: 'Ticket escalado', category: 'support' },
  { value: 'support.ticket.sla_risk', label: 'Ticket — SLA em risco', category: 'support' },
  { value: 'support.ticket.sla_breached', label: 'Ticket — SLA violado', category: 'support' },
  { value: 'conversation.quality.low_score_detected', label: 'Score de qualidade baixo', category: 'quality' },
] as const;

export const ACTION_CATALOG = [
  { value: 'add_conversation_tag', label: 'Adicionar tag à conversa', config: ['tag'] },
  { value: 'create_operational_alert', label: 'Criar alerta operacional', config: ['severity','title','message'] },
  { value: 'notify_user', label: 'Notificar utilizador', config: ['title','message'] },
  { value: 'notify_manager', label: 'Notificar gestor', config: ['title','message'] },
  { value: 'create_ticket', label: 'Criar ticket de suporte', config: ['subject','priority'] },
  { value: 'create_followup', label: 'Criar follow-up', config: ['title','due_at'] },
  { value: 'add_internal_note', label: 'Adicionar nota interna', config: ['note'] },
  { value: 'change_ticket_priority', label: 'Mudar prioridade do ticket', config: ['priority'] },
  { value: 'assign_conversation', label: 'Atribuir conversa', config: ['user_id'] },
  { value: 'trigger_conversation_analysis', label: 'Disparar análise de conversa', config: [] },
  { value: 'trigger_audio_transcription', label: 'Disparar transcrição de áudio', config: [] },
  { value: 'trigger_quality_review', label: 'Disparar revisão de qualidade', config: [] },
  { value: 'send_whatsapp_template', label: '⚠️ Enviar template WhatsApp', config: ['template_id'], sensitive: true },
] as const;

export const FIELD_CATALOG = [
  'intent','sentiment','urgency','priority','assigned_to','assigned_team_id',
  'conversation_status','ticket_status','ticket_priority','sla_status','contact_tag',
  'product_id','product_category','channel','agent_id','quality_score',
  'no_response_minutes','message_type','country','business_hours',
] as const;

export const OPERATOR_CATALOG = [
  'equals','not_equals','contains','not_contains','greater_than','less_than',
  'is_empty','is_not_empty','in','not_in','before','after',
] as const;
