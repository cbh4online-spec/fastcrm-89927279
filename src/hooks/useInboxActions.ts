import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";
import { useAuth } from "@/contexts/AuthContext";
import { AutomationRule, AutomationTrigger, useAutomationRules } from "./useAutomations";
import { useCreateActivity } from "./useCrmActivities";
import { toast } from "sonner";
import { performInboxSafetyCheck, requiresConfirmation } from "@/lib/inboxSafety";
import { useAutomationGlobalPause, useCheckEntityRateLimit } from "./useAutomationSafety";

export type InboxActionType =
  | "mark_high_priority"
  | "change_lead_status"
  | "create_opportunity"
  | "send_proposal"
  | "schedule_followup"
  | "mark_resolved";

export interface InboxActionLog {
  id: string;
  workspace_id: string;
  conversation_id: string;
  lead_id: string | null;
  action_type: InboxActionType;
  action_data: Record<string, unknown> | null;
  automation_triggered: boolean;
  automation_rule_id: string | null;
  performed_by: string;
  created_at: string;
}

// Map inbox actions to automation triggers
export const actionToTriggerMap: Record<InboxActionType, AutomationTrigger | null> = {
  mark_high_priority: "conversation_priority_changed",
  change_lead_status: "lead_status_changed",
  create_opportunity: "opportunity_created",
  send_proposal: "proposal_created",
  schedule_followup: null, // No specific trigger
  mark_resolved: "conversation_resolved",
};

export function useInboxActionLogs(conversationId?: string) {
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useQuery({
    queryKey: ["inbox_action_logs", currentWorkspace?.id, conversationId],
    queryFn: async () => {
      if (!currentWorkspace) return [];

      let query = workspaceClient
        .from("inbox_action_logs")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .order("created_at", { ascending: false })
        .limit(100);

      if (conversationId) {
        query = query.eq("conversation_id", conversationId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as InboxActionLog[];
    },
    enabled: !!currentWorkspace,
  });
}

export function useMatchingAutomations() {
  const { data: rules } = useAutomationRules();
  
  // Get active rules that match inbox triggers
  const inboxTriggers: AutomationTrigger[] = [
    "conversation_priority_changed",
    "lead_status_changed",
    "opportunity_created",
    "proposal_created",
    "conversation_resolved",
  ];

  return rules?.filter(
    (rule) => rule.is_active && inboxTriggers.includes(rule.trigger)
  ) || [];
}

export function useCheckAutomationsForAction(
  actionType: InboxActionType,
  actionData?: Record<string, unknown>
) {
  const matchingRules = useMatchingAutomations();
  const trigger = actionToTriggerMap[actionType];

  if (!trigger) return [];

  return matchingRules.filter((rule) => {
    if (rule.trigger !== trigger) return false;

    // Check additional conditions based on action data
    if (actionType === "mark_high_priority" && rule.trigger_config?.priority_to) {
      return rule.trigger_config.priority_to === "high";
    }

    if (actionType === "change_lead_status" && actionData?.status) {
      // Check if rule conditions match the new status
      const statusCondition = rule.conditions?.find(
        (c) => c.field_name === "status" && c.operator === "equals"
      );
      if (statusCondition && statusCondition.value !== actionData.status) {
        return false;
      }
    }

    return true;
  });
}

export function useExecuteInboxAction() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();
  const { user } = useAuth();
  const { data: isGloballyPaused = false } = useAutomationGlobalPause();

  return useMutation({
    mutationFn: async ({
      conversationId,
      leadId,
      actionType,
      actionData,
      triggerAutomation = false,
      automationRuleId,
      isAutomatedAction = false,
    }: {
      conversationId: string;
      leadId?: string | null;
      actionType: InboxActionType;
      actionData?: Record<string, unknown>;
      triggerAutomation?: boolean;
      automationRuleId?: string;
      isAutomatedAction?: boolean;
    }) => {
      if (!currentWorkspace || !user) throw new Error("Not authenticated");

      // Safety check for automated actions
      if (isAutomatedAction || triggerAutomation) {
        const safetyCheck = performInboxSafetyCheck({
          action: actionType,
          conversationId,
          isGloballyPaused,
          isInboxAutomationsPaused: false, // Would be fetched in real impl
          isAutomatedAction: true,
        });

        if (!safetyCheck.canExecute) {
          throw new Error(safetyCheck.reason || "Ação bloqueada por controlo de segurança");
        }
      }

      // Log the action
      const { data, error } = await workspaceClient
        .from("inbox_action_logs")
        .insert({
          workspace_id: currentWorkspace.id,
          conversation_id: conversationId,
          lead_id: leadId || null,
          action_type: actionType,
          action_data: actionData ? JSON.parse(JSON.stringify(actionData)) : null,
          automation_triggered: triggerAutomation,
          automation_rule_id: automationRuleId || null,
          performed_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as InboxActionLog;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbox_action_logs"] });
    },
    onError: (error) => {
      console.error("Failed to log inbox action:", error);
    },
  });
}

export function useUpdateConversationPriority() {
  const queryClient = useQueryClient();
  const { workspaceClient } = useWorkspaceInstance();
  const executeAction = useExecuteInboxAction();

  return useMutation({
    mutationFn: async ({
      conversationId,
      leadId,
      priority,
      triggerAutomation = false,
      automationRuleId,
    }: {
      conversationId: string;
      leadId?: string | null;
      priority: "high" | "medium" | "low";
      triggerAutomation?: boolean;
      automationRuleId?: string;
    }) => {
      // Update conversation priority
      const { error } = await workspaceClient
        .from("conversations")
        .update({ user_priority: priority })
        .eq("id", conversationId);

      if (error) throw error;

      // Log the action
      await executeAction.mutateAsync({
        conversationId,
        leadId,
        actionType: "mark_high_priority",
        actionData: { priority },
        triggerAutomation,
        automationRuleId,
      });

      return { conversationId, priority };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["conversation"] });
      toast.success("Prioridade atualizada");
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar prioridade: ${error.message}`);
    },
  });
}

export function useUpdateLeadStatusFromInbox() {
  const queryClient = useQueryClient();
  const { workspaceClient } = useWorkspaceInstance();
  const executeAction = useExecuteInboxAction();

  return useMutation({
    mutationFn: async ({
      conversationId,
      leadId,
      status,
      triggerAutomation = false,
      automationRuleId,
    }: {
      conversationId: string;
      leadId: string;
      status: string;
      triggerAutomation?: boolean;
      automationRuleId?: string;
    }) => {
      // Update lead status
      const { error } = await workspaceClient
        .from("leads")
        .update({ status })
        .eq("id", leadId);

      if (error) throw error;

      // Log the action
      await executeAction.mutateAsync({
        conversationId,
        leadId,
        actionType: "change_lead_status",
        actionData: { status },
        triggerAutomation,
        automationRuleId,
      });

      return { leadId, status };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["lead"] });
      toast.success("Status do lead atualizado");
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar status: ${error.message}`);
    },
  });
}

export function useMarkConversationResolved() {
  const queryClient = useQueryClient();
  const { workspaceClient } = useWorkspaceInstance();
  const executeAction = useExecuteInboxAction();

  return useMutation({
    mutationFn: async ({
      conversationId,
      leadId,
      triggerAutomation = false,
      automationRuleId,
    }: {
      conversationId: string;
      leadId?: string | null;
      triggerAutomation?: boolean;
      automationRuleId?: string;
    }) => {
      // Update conversation status
      const { error } = await workspaceClient
        .from("conversations")
        .update({ status: "closed" })
        .eq("id", conversationId);

      if (error) throw error;

      // Log the action
      await executeAction.mutateAsync({
        conversationId,
        leadId,
        actionType: "mark_resolved",
        actionData: { status: "closed" },
        triggerAutomation,
        automationRuleId,
      });

      return { conversationId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["conversation"] });
      toast.success("Conversa marcada como resolvida");
    },
    onError: (error) => {
      toast.error(`Erro ao resolver conversa: ${error.message}`);
    },
  });
}
