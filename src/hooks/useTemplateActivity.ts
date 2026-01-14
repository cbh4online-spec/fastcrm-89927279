import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface TemplateActivityLog {
  id: string;
  workspace_id: string;
  template_id: string;
  entity_type: string;
  entity_id: string;
  rendered_content: string;
  rendered_subject: string | null;
  variables_used: Record<string, string>;
  missing_variables: string[];
  user_id: string;
  channel: string;
  created_at: string;
}

export function useTemplateActivityLogs(entityType?: string, entityId?: string) {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ['template-activity-logs', currentWorkspace?.id, entityType, entityId],
    queryFn: async () => {
      if (!currentWorkspace) return [];

      let query = supabase
        .from('template_activity_logs' as any)
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .order('created_at', { ascending: false });

      if (entityType && entityId) {
        query = query.eq('entity_type', entityType).eq('entity_id', entityId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as TemplateActivityLog[];
    },
    enabled: !!currentWorkspace,
  });
}

export function useLogTemplateActivity() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      templateId,
      entityType,
      entityId,
      renderedContent,
      renderedSubject,
      variablesUsed,
      missingVariables,
      channel,
    }: {
      templateId: string;
      entityType: string;
      entityId: string;
      renderedContent: string;
      renderedSubject?: string;
      variablesUsed: Record<string, string>;
      missingVariables: string[];
      channel: string;
    }) => {
      if (!currentWorkspace || !user) throw new Error('No workspace or user');

      const { data, error } = await supabase
        .from('template_activity_logs' as any)
        .insert({
          workspace_id: currentWorkspace.id,
          template_id: templateId,
          entity_type: entityType,
          entity_id: entityId,
          rendered_content: renderedContent,
          rendered_subject: renderedSubject || null,
          variables_used: variablesUsed,
          missing_variables: missingVariables,
          user_id: user.id,
          channel,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as TemplateActivityLog;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['template-activity-logs'] });
    },
    onError: (err: any) => {
      console.error('Failed to log template activity:', err);
    },
  });
}

export function useApplyTemplate() {
  const logActivity = useLogTemplateActivity();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      templateId,
      templateType,
      entityType,
      entityId,
      renderedContent,
      renderedSubject,
      variablesUsed,
      missingVariables = [],
    }: {
      templateId: string;
      templateType: string;
      entityType: string;
      entityId: string;
      renderedContent: string;
      renderedSubject?: string;
      variablesUsed: Record<string, string>;
      missingVariables?: string[];
    }) => {
      // Log the activity
      await logActivity.mutateAsync({
        templateId,
        entityType,
        entityId,
        renderedContent,
        renderedSubject,
        variablesUsed,
        missingVariables,
        channel: templateType,
      });

      // Increment template usage
      const { data: current } = await supabase
        .from('templates' as any)
        .select('usage_count')
        .eq('id', templateId)
        .single();

      await supabase
        .from('templates' as any)
        .update({
          usage_count: ((current as any)?.usage_count || 0) + 1,
          last_used_at: new Date().toISOString(),
        } as any)
        .eq('id', templateId);

      return { renderedContent, renderedSubject };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast.success('Template aplicado com sucesso');
    },
    onError: (err: any) => {
      toast.error(`Erro ao aplicar template: ${err.message}`);
    },
  });
}
