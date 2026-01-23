/**
 * Student Journey Automations Hook
 * Manages SJ-specific automation rules and execution
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import {
  SJAutomation,
  SJTriggerType,
  SJActionType,
  SJAutomationCondition,
  SJAutomationAction,
  DEFAULT_SJ_AUTOMATIONS,
} from "@/types/sjAutomation";
import type { Json } from "@/integrations/supabase/types";

// Query keys
const SJ_AUTOMATIONS_KEY = "sj-automations";
const SJ_AUTOMATION_LOGS_KEY = "sj-automation-logs";

interface SJAutomationLog {
  id: string;
  automationId: string;
  automationName: string;
  profileId: string;
  enrollmentId?: string;
  triggerType: SJTriggerType;
  triggerData: Record<string, unknown>;
  actionsExecuted: Array<{
    type: SJActionType;
    success: boolean;
    result?: Record<string, unknown>;
    error?: string;
  }>;
  status: "success" | "partial" | "failed";
  executedAt: string;
}

/**
 * Fetch all SJ automations for the workspace
 */
export function useSJAutomations() {
  const { workspaceClient } = useWorkspaceInstance();
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: [SJ_AUTOMATIONS_KEY, currentWorkspace?.id],
    queryFn: async () => {
      if (!workspaceClient || !currentWorkspace) return [];

      const { data, error } = await workspaceClient
        .from("sj_automations")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []).map((row) => ({
        id: row.id,
        name: row.name,
        description: row.description || "",
        triggerType: row.trigger_type as SJTriggerType,
        triggerConfig: (row.trigger_config as Record<string, unknown>) || {},
        conditions: (row.conditions as unknown as SJAutomationCondition[]) || [],
        actions: (row.actions as unknown as SJAutomationAction[]) || [],
        isActive: row.is_active,
        isSystem: row.is_system || false,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        workspaceId: row.workspace_id,
      })) as SJAutomation[];
    },
    enabled: !!workspaceClient && !!currentWorkspace,
  });
}

/**
 * Fetch automation execution logs
 */
export function useSJAutomationLogs(automationId?: string) {
  const { workspaceClient } = useWorkspaceInstance();
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: [SJ_AUTOMATION_LOGS_KEY, currentWorkspace?.id, automationId],
    queryFn: async () => {
      if (!workspaceClient || !currentWorkspace) return [];

      let query = workspaceClient
        .from("sj_automation_logs")
        .select("*")
        .order("executed_at", { ascending: false })
        .limit(100);

      if (automationId) {
        query = query.eq("automation_id", automationId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map((row) => ({
        id: row.id,
        automationId: row.automation_id,
        automationName: row.automation_name,
        profileId: row.profile_id,
        enrollmentId: row.enrollment_id,
        triggerType: row.trigger_type as SJTriggerType,
        triggerData: (row.trigger_data as Record<string, unknown>) || {},
        actionsExecuted: row.actions_executed as unknown as SJAutomationLog["actionsExecuted"],
        status: row.status as SJAutomationLog["status"],
        executedAt: row.executed_at,
      })) as SJAutomationLog[];
    },
    enabled: !!workspaceClient && !!currentWorkspace,
  });
}

/**
 * Create a new SJ automation
 */
export function useCreateSJAutomation() {
  const { workspaceClient } = useWorkspaceInstance();
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      input: Omit<SJAutomation, "id" | "createdAt" | "updatedAt" | "workspaceId">
    ) => {
      if (!workspaceClient || !currentWorkspace) {
        throw new Error("Workspace not available");
      }

      const { data, error } = await workspaceClient
        .from("sj_automations")
        .insert({
          workspace_id: currentWorkspace.id,
          name: input.name,
          description: input.description,
          trigger_type: input.triggerType,
          trigger_config: input.triggerConfig as Json,
          conditions: input.conditions as unknown as Json,
          actions: input.actions as unknown as Json,
          is_active: input.isActive,
          is_system: input.isSystem || false,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [SJ_AUTOMATIONS_KEY, currentWorkspace?.id],
      });
      toast.success("Automação criada com sucesso");
    },
    onError: (error) => {
      console.error("Error creating SJ automation:", error);
      toast.error("Erro ao criar automação");
    },
  });
}

/**
 * Update an existing SJ automation
 */
export function useUpdateSJAutomation() {
  const { workspaceClient } = useWorkspaceInstance();
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<SJAutomation> & { id: string }) => {
      if (!workspaceClient) throw new Error("Workspace not available");

      const updateData: Record<string, unknown> = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined)
        updateData.description = updates.description;
      if (updates.triggerType !== undefined)
        updateData.trigger_type = updates.triggerType;
      if (updates.triggerConfig !== undefined)
        updateData.trigger_config = updates.triggerConfig;
      if (updates.conditions !== undefined)
        updateData.conditions = updates.conditions;
      if (updates.actions !== undefined) updateData.actions = updates.actions;
      if (updates.isActive !== undefined) updateData.is_active = updates.isActive;

      const { data, error } = await workspaceClient
        .from("sj_automations")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [SJ_AUTOMATIONS_KEY, currentWorkspace?.id],
      });
      toast.success("Automação atualizada");
    },
    onError: (error) => {
      console.error("Error updating SJ automation:", error);
      toast.error("Erro ao atualizar automação");
    },
  });
}

/**
 * Toggle automation active state
 */
export function useToggleSJAutomation() {
  const { workspaceClient } = useWorkspaceInstance();
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      if (!workspaceClient) throw new Error("Workspace not available");

      const { error } = await workspaceClient
        .from("sj_automations")
        .update({ is_active: isActive })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: (_, { isActive }) => {
      queryClient.invalidateQueries({
        queryKey: [SJ_AUTOMATIONS_KEY, currentWorkspace?.id],
      });
      toast.success(isActive ? "Automação ativada" : "Automação desativada");
    },
    onError: (error) => {
      console.error("Error toggling SJ automation:", error);
      toast.error("Erro ao alterar estado da automação");
    },
  });
}

/**
 * Delete an SJ automation
 */
export function useDeleteSJAutomation() {
  const { workspaceClient } = useWorkspaceInstance();
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!workspaceClient) throw new Error("Workspace not available");

      const { error } = await workspaceClient
        .from("sj_automations")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [SJ_AUTOMATIONS_KEY, currentWorkspace?.id],
      });
      toast.success("Automação eliminada");
    },
    onError: (error) => {
      console.error("Error deleting SJ automation:", error);
      toast.error("Erro ao eliminar automação");
    },
  });
}

/**
 * Initialize default automations for the workspace
 */
export function useInitializeSJAutomations() {
  const { workspaceClient } = useWorkspaceInstance();
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!workspaceClient || !currentWorkspace) {
        throw new Error("Workspace not available");
      }

      // Check if automations already exist
      const { data: existing } = await workspaceClient
        .from("sj_automations")
        .select("id")
        .limit(1);

      if (existing && existing.length > 0) {
        return { created: 0, message: "Automações já existem" };
      }

      // Insert default automations
      const automationsToInsert = DEFAULT_SJ_AUTOMATIONS.map((automation) => ({
        workspace_id: currentWorkspace.id,
        name: automation.name,
        description: automation.description,
        trigger_type: automation.triggerType,
        trigger_config: automation.triggerConfig as Json,
        conditions: automation.conditions as unknown as Json,
        actions: automation.actions as unknown as Json,
        is_active: automation.isActive,
        is_system: automation.isSystem,
      }));

      const { error } = await workspaceClient
        .from("sj_automations")
        .insert(automationsToInsert);

      if (error) throw error;

      return { created: automationsToInsert.length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: [SJ_AUTOMATIONS_KEY, currentWorkspace?.id],
      });
      if (result.created > 0) {
        toast.success(`${result.created} automações criadas`);
      }
    },
    onError: (error) => {
      console.error("Error initializing SJ automations:", error);
      toast.error("Erro ao inicializar automações");
    },
  });
}
