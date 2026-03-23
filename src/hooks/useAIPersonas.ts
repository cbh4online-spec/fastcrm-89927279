import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { toast } from 'sonner';
import type { AIPersona } from '@/types/ai-assistants';

export function useAIPersonas(includeArchived = false) {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ['ai-personas', currentWorkspace?.id, includeArchived],
    queryFn: async (): Promise<AIPersona[]> => {
      let query = supabase
        .from('ai_personas')
        .select('*, vibe_profile:vibe_profiles(*)')
        .eq('workspace_id', currentWorkspace!.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (!includeArchived) query = query.neq('status', 'archived');

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as AIPersona[];
    },
    enabled: !!currentWorkspace?.id,
    staleTime: 60_000,
  });
}

export function useDefaultPersona() {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ['ai-persona-default', currentWorkspace?.id],
    queryFn: async (): Promise<AIPersona | null> => {
      const { data } = await supabase
        .from('ai_personas')
        .select('*, vibe_profile:vibe_profiles(*)')
        .eq('workspace_id', currentWorkspace!.id)
        .eq('is_default', true)
        .eq('status', 'active')
        .maybeSingle();
      return (data as unknown as AIPersona) ?? null;
    },
    enabled: !!currentWorkspace?.id,
    staleTime: 120_000,
  });
}

export function useCreatePersona() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (payload: Partial<AIPersona>) => {
      const { data, error } = await supabase
        .from('ai_personas')
        .insert({
          ...payload,
          workspace_id: currentWorkspace!.id,
          name: payload.name ?? 'Nova Persona',
          persona_type: payload.persona_type ?? payload.role ?? 'assistant',
          tone_of_voice: payload.tone_of_voice ?? 'professional',
          created_by: (await supabase.auth.getUser()).data.user?.id,
        } as any)
        .select('*, vibe_profile:vibe_profiles(*)')
        .single();
      if (error) throw error;
      return data as unknown as AIPersona;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ai-personas', currentWorkspace?.id] });
      toast.success('Persona criada');
    },
    onError: () => toast.error('Erro ao criar persona'),
  });
}

export function useUpdatePersona() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<AIPersona> }) => {
      const { data, error } = await supabase
        .from('ai_personas')
        .update(updates as any)
        .eq('id', id)
        .eq('workspace_id', currentWorkspace!.id)
        .select('*, vibe_profile:vibe_profiles(*)')
        .single();
      if (error) throw error;
      return data as unknown as AIPersona;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ai-personas', currentWorkspace?.id] });
      toast.success('Persona atualizada');
    },
    onError: () => toast.error('Erro ao atualizar persona'),
  });
}

export function useDeletePersona() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ai_personas')
        .update({ status: 'archived' })
        .eq('id', id)
        .eq('workspace_id', currentWorkspace!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ai-personas', currentWorkspace?.id] });
      toast.success('Persona arquivada');
    },
  });
}

export function useSetDefaultPersona() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (personaId: string) => {
      await supabase
        .from('ai_personas')
        .update({ is_default: false })
        .eq('workspace_id', currentWorkspace!.id)
        .eq('is_default', true);

      const { error } = await supabase
        .from('ai_personas')
        .update({ is_default: true })
        .eq('id', personaId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ai-personas', currentWorkspace?.id] });
      qc.invalidateQueries({ queryKey: ['ai-persona-default', currentWorkspace?.id] });
      toast.success('Persona padrão definida');
    },
  });
}

export function useGeneratePersona() {
  return useMutation({
    mutationFn: async ({ description, workspaceId, save }: {
      description: string;
      workspaceId: string;
      save?: boolean;
    }) => {
      const { data, error } = await supabase.functions.invoke('ai-persona-generate', {
        body: { workspace_id: workspaceId, description, save },
      });
      if (error) throw error;
      return data.persona;
    },
  });
}

export function usePersonaChat() {
  return useMutation({
    mutationFn: async ({ personaId, workspaceId, messages, context }: {
      personaId: string;
      workspaceId: string;
      messages: Array<{ role: 'user' | 'assistant'; content: string }>;
      context?: Record<string, unknown>;
    }) => {
      const { data, error } = await supabase.functions.invoke('ai-persona-chat', {
        body: { persona_id: personaId, workspace_id: workspaceId, messages, context },
      });
      if (error) throw error;
      return data as { message: string; tokens_used: number };
    },
  });
}
