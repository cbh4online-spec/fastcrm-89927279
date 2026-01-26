import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import type { AgentSchedule, CreateScheduleRequest } from "@/types/agentLifecycle";

/**
 * Hook to manage AI agent schedules for a workspace
 */
export function useAgentSchedules() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const workspaceId = currentWorkspace?.id;

  // Fetch all schedules for workspace
  const { data: schedules, isLoading, error } = useQuery({
    queryKey: ['agent-schedules', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];

      const { data, error } = await supabase
        .from('ai_agent_schedules')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform snake_case to camelCase
      return (data || []).map(transformSchedule);
    },
    enabled: !!workspaceId,
  });

  // Create schedule mutation
  const createMutation = useMutation({
    mutationFn: async (request: Omit<CreateScheduleRequest, 'workspaceId'>) => {
      if (!workspaceId) throw new Error('Workspace não definido');

      const insertData = {
        workspace_id: workspaceId,
        name: request.name,
        description: request.description || null,
        agent_type: request.agentType,
        entity_filter: request.entityFilter || {},
        cron_expression: request.cronExpression,
        timezone: request.timezone || 'Europe/Lisbon',
        max_entities_per_run: request.maxEntitiesPerRun || 50,
        priority: request.priority || 30,
        is_enabled: true,
        next_run_at: calculateNextRun(request.cronExpression),
      };

      const { data, error } = await supabase
        .from('ai_agent_schedules')
        .insert(insertData as any)
        .select()
        .single();

      if (error) throw error;
      return transformSchedule(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-schedules', workspaceId] });
      toast.success('Agendamento criado com sucesso');
    },
    onError: (error: Error) => {
      toast.error('Erro ao criar agendamento', { description: error.message });
    },
  });

  // Update schedule mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AgentSchedule> & { id: string }) => {
      const dbUpdates: Record<string, unknown> = {};
      
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.agentType !== undefined) dbUpdates.agent_type = updates.agentType;
      if (updates.entityFilter !== undefined) dbUpdates.entity_filter = updates.entityFilter;
      if (updates.cronExpression !== undefined) {
        dbUpdates.cron_expression = updates.cronExpression;
        dbUpdates.next_run_at = calculateNextRun(updates.cronExpression);
      }
      if (updates.timezone !== undefined) dbUpdates.timezone = updates.timezone;
      if (updates.maxEntitiesPerRun !== undefined) dbUpdates.max_entities_per_run = updates.maxEntitiesPerRun;
      if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
      if (updates.isEnabled !== undefined) dbUpdates.is_enabled = updates.isEnabled;

      const { data, error } = await supabase
        .from('ai_agent_schedules')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return transformSchedule(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-schedules', workspaceId] });
      toast.success('Agendamento atualizado');
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar agendamento', { description: error.message });
    },
  });

  // Delete schedule mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ai_agent_schedules')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-schedules', workspaceId] });
      toast.success('Agendamento eliminado');
    },
    onError: (error: Error) => {
      toast.error('Erro ao eliminar agendamento', { description: error.message });
    },
  });

  // Toggle schedule enabled/disabled
  const toggleMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const updates: Record<string, unknown> = { is_enabled: enabled };
      
      if (enabled) {
        // Recalculate next run when re-enabling
        const { data: schedule } = await supabase
          .from('ai_agent_schedules')
          .select('cron_expression')
          .eq('id', id)
          .single();
        
        if (schedule) {
          updates.next_run_at = calculateNextRun(schedule.cron_expression);
        }
      }

      const { data, error } = await supabase
        .from('ai_agent_schedules')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return transformSchedule(data);
    },
    onSuccess: (schedule) => {
      queryClient.invalidateQueries({ queryKey: ['agent-schedules', workspaceId] });
      toast.success(schedule.isEnabled ? 'Agendamento ativado' : 'Agendamento pausado');
    },
    onError: (error: Error) => {
      toast.error('Erro ao alterar estado do agendamento', { description: error.message });
    },
  });

  return {
    // Data
    schedules: schedules || [],
    isLoading,
    error,

    // Actions
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    delete: deleteMutation.mutateAsync,
    toggle: (id: string, enabled: boolean) => toggleMutation.mutateAsync({ id, enabled }),

    // States
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

// Transform database row to typed object
function transformSchedule(row: Record<string, unknown>): AgentSchedule {
  return {
    id: row.id as string,
    workspaceId: row.workspace_id as string,
    name: row.name as string,
    description: row.description as string | null,
    agentType: row.agent_type as string,
    entityFilter: (row.entity_filter as Record<string, unknown>) || {},
    cronExpression: row.cron_expression as string,
    timezone: row.timezone as string,
    lastRunAt: row.last_run_at as string | null,
    nextRunAt: row.next_run_at as string | null,
    maxEntitiesPerRun: row.max_entities_per_run as number,
    priority: row.priority as number,
    isEnabled: row.is_enabled as boolean,
    createdAt: row.created_at as string,
    createdBy: row.created_by as string | null,
  };
}

// Simple next run calculation (same as in scheduler)
function calculateNextRun(cronExpression: string): string {
  const parts = cronExpression.split(" ");
  const next = new Date();
  
  if (parts.length === 5) {
    const [minute, hour] = parts;
    if (minute !== "*" && hour !== "*") {
      next.setHours(parseInt(hour), parseInt(minute), 0, 0);
      if (next <= new Date()) {
        next.setDate(next.getDate() + 1);
      }
      return next.toISOString();
    }
  }

  // Default: tomorrow at 9am
  next.setDate(next.getDate() + 1);
  next.setHours(9, 0, 0, 0);
  return next.toISOString();
}
