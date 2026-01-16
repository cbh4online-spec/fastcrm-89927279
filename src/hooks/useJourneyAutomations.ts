import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { 
  JourneyAutomation, 
  JourneyAutomationLog,
  DEFAULT_JOURNEY_AUTOMATIONS
} from '@/types/journeyAutomation';
import { journeyAutomationEngine } from '@/services/JourneyAutomationEngine';
import { toast } from 'sonner';

// Fetch all journey automations
export function useJourneyAutomations() {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ['journey-automations', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];

      const { data, error } = await supabase
        .from('journey_automations')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as unknown as JourneyAutomation[];
    },
    enabled: !!currentWorkspace?.id
  });
}

// Fetch automation logs
export function useJourneyAutomationLogs(automationId?: string) {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ['journey-automation-logs', currentWorkspace?.id, automationId],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];

      let query = supabase
        .from('journey_automation_logs')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .order('executed_at', { ascending: false })
        .limit(100);

      if (automationId) {
        query = query.eq('automation_id', automationId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as JourneyAutomationLog[];
    },
    enabled: !!currentWorkspace?.id
  });
}

// Fetch AI suggestions for an entity
export function useJourneyAISuggestions(entityType: 'contact' | 'company', entityId: string) {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ['journey-ai-suggestions', entityType, entityId],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];

      const { data, error } = await supabase
        .from('journey_ai_suggestions')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!currentWorkspace?.id && !!entityId
  });
}

// Create automation
export function useCreateJourneyAutomation() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (automation: Omit<JourneyAutomation, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'workspaceId'>) => {
      if (!currentWorkspace?.id) throw new Error('No workspace');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Calculate affected clients
      const affectedCount = await journeyAutomationEngine.calculateAffectedClients(
        currentWorkspace.id,
        automation.triggerType,
        automation.triggerConfig
      );

      const { data, error } = await supabase
        .from('journey_automations')
        .insert({
          workspace_id: currentWorkspace.id,
          name: automation.name,
          description: automation.description,
          trigger_type: automation.triggerType,
          trigger_config: JSON.parse(JSON.stringify(automation.triggerConfig)),
          conditions: JSON.parse(JSON.stringify(automation.conditions)),
          actions: JSON.parse(JSON.stringify(automation.actions)),
          is_active: automation.isActive,
          affected_clients_count: affectedCount,
          created_by: user.id
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journey-automations'] });
      toast.success('Automação criada com sucesso');
    },
    onError: (error) => {
      toast.error('Erro ao criar automação');
      console.error(error);
    }
  });
}

// Update automation
export function useUpdateJourneyAutomation() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<JourneyAutomation> & { id: string }) => {
      const updateData: Record<string, unknown> = {};

      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.triggerType !== undefined) updateData.trigger_type = updates.triggerType;
      if (updates.triggerConfig !== undefined) updateData.trigger_config = updates.triggerConfig;
      if (updates.conditions !== undefined) updateData.conditions = updates.conditions;
      if (updates.actions !== undefined) updateData.actions = updates.actions;
      if (updates.isActive !== undefined) updateData.is_active = updates.isActive;

      // Recalculate affected clients if trigger changed
      if (updates.triggerType && updates.triggerConfig && currentWorkspace?.id) {
        updateData.affected_clients_count = await journeyAutomationEngine.calculateAffectedClients(
          currentWorkspace.id,
          updates.triggerType,
          updates.triggerConfig
        );
      }

      const { data, error } = await supabase
        .from('journey_automations')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journey-automations'] });
      toast.success('Automação atualizada');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar automação');
      console.error(error);
    }
  });
}

// Toggle automation active state
export function useToggleJourneyAutomation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { data, error } = await supabase
        .from('journey_automations')
        .update({ is_active: isActive })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { isActive }) => {
      queryClient.invalidateQueries({ queryKey: ['journey-automations'] });
      toast.success(isActive ? 'Automação ativada' : 'Automação desativada');
    },
    onError: (error) => {
      toast.error('Erro ao alterar estado da automação');
      console.error(error);
    }
  });
}

// Delete automation
export function useDeleteJourneyAutomation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('journey_automations')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journey-automations'] });
      toast.success('Automação eliminada');
    },
    onError: (error) => {
      toast.error('Erro ao eliminar automação');
      console.error(error);
    }
  });
}

// Initialize default automations for a workspace
export function useInitializeDefaultAutomations() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async () => {
      if (!currentWorkspace?.id) throw new Error('No workspace');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check if automations already exist
      const { count } = await supabase
        .from('journey_automations')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', currentWorkspace.id);

      if (count && count > 0) {
        toast.info('Automações já existem neste workspace');
        return;
      }

      // Create default automations
      const automationsToCreate = DEFAULT_JOURNEY_AUTOMATIONS.map(auto => ({
        workspace_id: currentWorkspace.id,
        name: auto.name,
        description: auto.description,
        trigger_type: auto.triggerType,
        trigger_config: JSON.parse(JSON.stringify(auto.triggerConfig)),
        conditions: JSON.parse(JSON.stringify(auto.conditions)),
        actions: JSON.parse(JSON.stringify(auto.actions)),
        is_active: auto.isActive,
        affected_clients_count: 0,
        created_by: user.id
      }));

      const { error } = await supabase
        .from('journey_automations')
        .insert(automationsToCreate);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journey-automations'] });
      toast.success('Automações padrão criadas');
    },
    onError: (error) => {
      toast.error('Erro ao criar automações padrão');
      console.error(error);
    }
  });
}

// Update AI suggestion status
export function useUpdateAISuggestionStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'accepted' | 'dismissed' | 'executed' }) => {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('journey_ai_suggestions')
        .update({ 
          status,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['journey-ai-suggestions'] });
      const messages = {
        accepted: 'Sugestão aceite',
        dismissed: 'Sugestão descartada',
        executed: 'Ação executada'
      };
      toast.success(messages[status]);
    }
  });
}
