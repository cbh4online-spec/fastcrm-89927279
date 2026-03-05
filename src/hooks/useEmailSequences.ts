import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { emitKernelEvent } from '@/lib/kernelEmitter';

export interface EmailSequence {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  isActive: boolean;
  exitConditions: { type: string; label?: string }[];
  tags: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  stepsCount?: number;
  enrollmentsCount?: number;
}

export interface SequenceStep {
  id: string;
  sequenceId: string;
  stepOrder: number;
  templateId: string | null;
  subject: string | null;
  body: string | null;
  delayDays: number;
  delayHours: number;
  channel: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  templateName?: string;
}

export interface SequenceEnrollment {
  id: string;
  workspaceId: string;
  sequenceId: string;
  contactId: string;
  currentStep: number;
  status: 'active' | 'paused' | 'completed' | 'exited';
  exitReason: string | null;
  enrolledBy: string;
  enrolledAt: string;
  completedAt: string | null;
  nextSendAt: string | null;
  updatedAt: string;
}

export function useEmailSequences() {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ['email-sequences', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];

      const { data, error } = await supabase
        .from('email_sequences')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(s => ({
        id: s.id,
        workspaceId: s.workspace_id,
        name: s.name,
        description: s.description,
        isActive: s.is_active,
        exitConditions: (s.exit_conditions as any) || [],
        tags: s.tags || [],
        createdBy: s.created_by,
        createdAt: s.created_at,
        updatedAt: s.updated_at,
      })) as EmailSequence[];
    },
    enabled: !!currentWorkspace?.id,
  });
}

export function useCreateSequence() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: { name: string; description?: string; tags?: string[]; exitConditions?: { type: string }[] }) => {
      if (!currentWorkspace?.id || !user?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('email_sequences')
        .insert({
          workspace_id: currentWorkspace.id,
          name: input.name,
          description: input.description || null,
          tags: input.tags || [],
          exit_conditions: input.exitConditions || [],
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-sequences'] });
      toast.success('Sequência criada com sucesso');
    },
    onError: () => toast.error('Erro ao criar sequência'),
  });
}

export function useUpdateSequence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; description?: string; is_active?: boolean; exit_conditions?: any[]; tags?: string[] }) => {
      const { error } = await supabase
        .from('email_sequences')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-sequences'] });
      toast.success('Sequência atualizada');
    },
    onError: () => toast.error('Erro ao atualizar sequência'),
  });
}

export function useDeleteSequence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('email_sequences').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-sequences'] });
      toast.success('Sequência eliminada');
    },
    onError: () => toast.error('Erro ao eliminar sequência'),
  });
}

// Steps
export function useSequenceSteps(sequenceId?: string) {
  return useQuery({
    queryKey: ['sequence-steps', sequenceId],
    queryFn: async () => {
      if (!sequenceId) return [];

      const { data, error } = await supabase
        .from('email_sequence_steps')
        .select('*, communication_templates(name)')
        .eq('sequence_id', sequenceId)
        .order('step_order', { ascending: true });

      if (error) throw error;

      return (data || []).map(s => ({
        id: s.id,
        sequenceId: s.sequence_id,
        stepOrder: s.step_order,
        templateId: s.template_id,
        subject: s.subject,
        body: s.body,
        delayDays: s.delay_days,
        delayHours: s.delay_hours,
        channel: s.channel,
        isActive: s.is_active,
        createdAt: s.created_at,
        updatedAt: s.updated_at,
        templateName: (s as any).communication_templates?.name || null,
      })) as SequenceStep[];
    },
    enabled: !!sequenceId,
  });
}

export function useCreateStep() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { sequence_id: string; step_order: number; template_id?: string; subject?: string; body?: string; delay_days?: number; delay_hours?: number; channel?: string }) => {
      const { data, error } = await supabase
        .from('email_sequence_steps')
        .insert(input)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['sequence-steps', vars.sequence_id] });
    },
    onError: () => toast.error('Erro ao adicionar etapa'),
  });
}

export function useUpdateStep() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, sequenceId, ...updates }: { id: string; sequenceId: string; template_id?: string | null; subject?: string; body?: string; delay_days?: number; delay_hours?: number; is_active?: boolean }) => {
      const { error } = await supabase
        .from('email_sequence_steps')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['sequence-steps', vars.sequenceId] });
    },
    onError: () => toast.error('Erro ao atualizar etapa'),
  });
}

export function useDeleteStep() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, sequenceId }: { id: string; sequenceId: string }) => {
      const { error } = await supabase.from('email_sequence_steps').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['sequence-steps', vars.sequenceId] });
    },
    onError: () => toast.error('Erro ao eliminar etapa'),
  });
}

// Enrollments
export function useSequenceEnrollments(sequenceId?: string) {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ['sequence-enrollments', sequenceId],
    queryFn: async () => {
      if (!currentWorkspace?.id || !sequenceId) return [];

      const { data, error } = await supabase
        .from('email_sequence_enrollments')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .eq('sequence_id', sequenceId)
        .order('enrolled_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(e => ({
        id: e.id,
        workspaceId: e.workspace_id,
        sequenceId: e.sequence_id,
        contactId: e.contact_id,
        currentStep: e.current_step,
        status: e.status as SequenceEnrollment['status'],
        exitReason: e.exit_reason,
        enrolledBy: e.enrolled_by,
        enrolledAt: e.enrolled_at,
        completedAt: e.completed_at,
        nextSendAt: e.next_send_at,
        updatedAt: e.updated_at,
      })) as SequenceEnrollment[];
    },
    enabled: !!currentWorkspace?.id && !!sequenceId,
  });
}

export function useEnrollContact() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ sequenceId, contactId }: { sequenceId: string; contactId: string }) => {
      if (!currentWorkspace?.id || !user?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('email_sequence_enrollments')
        .insert({
          workspace_id: currentWorkspace.id,
          sequence_id: sequenceId,
          contact_id: contactId,
          enrolled_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['sequence-enrollments', vars.sequenceId] });
      console.log(`[EMAIL] Contact enrolled: sequence=${vars.sequenceId}, contact=${vars.contactId}`);
      if (currentWorkspace?.id) {
        emitKernelEvent({
          workspace_id: currentWorkspace.id,
          type: 'EMAIL.SEQUENCE_ENROLLED',
          entity_kind: 'email_sequence',
          entity_id: vars.sequenceId,
          source_module: 'comm-email',
          payload: { sequence_id: vars.sequenceId, contact_id: vars.contactId },
        });
      }
      toast.success('Contacto inscrito na sequência');
    },
    onError: (error) => {
      console.warn('[EMAIL] ENROLL_FAILED:', (error as Error).message);
      toast.error('Erro ao inscrever contacto');
    },
  });
}
