import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type AutomationTrigger =
  | "lead_created"
  | "lead_updated"
  | "lead_status_changed"
  | "lead_no_response"
  | "lead_score_changed"
  | "lead_temperature_changed"
  | "opportunity_created"
  | "opportunity_updated"
  | "opportunity_stage_changed"
  | "opportunity_value_changed"
  | "contact_created"
  | "contact_updated"
  | "contact_score_changed"
  | "contact_temperature_changed"
  | "company_created"
  | "company_updated"
  | "company_score_changed"
  | "company_temperature_changed"
  | "custom_field_updated"
  | "payment_confirmed"
  | "proposal_paid"
  | "message_received"
  | "first_message_from_lead"
  | "conversation_no_reply"
  | "conversation_resolved"
  | "conversation_priority_changed"
  | "proposal_created"
  | "proposal_viewed"
  | "scheduled_time"
  | "tag_added"
  | "tag_removed"
  | "form_submitted"
  | "store_purchase_completed"
  | "store_cart_abandoned"
  | "store_repurchase"
  | "store_first_purchase"
  | "store_order_status_changed"
  | "health_label_changed"
  | "health_score_below_threshold"
  | "health_score_dropped";

export type AutomationActionType =
  | "create_task"
  | "move_opportunity_stage"
  | "send_message"
  | "notify_user"
  | "assign_owner"
  | "add_tag"
  | "create_opportunity"
  | "update_field"
  | "send_template_message"
  | "create_proposal"
  | "send_proposal_link"
  | "wait_time"
  | "stop_automation"
  | "change_lead_status"
  | "send_followup_email"
  | "trigger_upsell_offer"
  | "start_onboarding_flow"
  | "activate_ai_assistant"
  | "schedule_repurchase_reminder";

export type ConditionOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "not_contains"
  | "greater_than"
  | "less_than"
  | "is_empty"
  | "is_not_empty";

export type ExecutionStatus = "pending" | "running" | "completed" | "failed";

export interface AutomationCondition {
  id: string;
  rule_id: string;
  field_name: string;
  operator: ConditionOperator;
  value: string | null;
  position: number;
  created_at: string;
}

export interface AutomationAction {
  id: string;
  rule_id: string;
  action_type: AutomationActionType;
  config: Record<string, unknown>;
  position: number;
  created_at: string;
}

export interface AutomationRule {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  trigger: AutomationTrigger;
  trigger_config?: {
    delay_hours?: number;
    delay_days?: number;
    scheduled_date?: string;
    no_response_hours?: number;
    // Inbox trigger config
    channels?: string[];
    no_reply_hours?: number;
    priority_from?: string;
    priority_to?: string;
  };
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  conditions?: AutomationCondition[];
  actions?: AutomationAction[];
}

export interface AutomationLog {
  id: string;
  rule_id: string;
  workspace_id: string;
  trigger_data: Record<string, unknown>;
  status: ExecutionStatus;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  actions_executed: Record<string, unknown>[];
  created_at: string;
  rule?: Pick<AutomationRule, "id" | "name">;
}

export interface CreateRuleInput {
  name: string;
  description?: string;
  trigger: AutomationTrigger;
  is_active?: boolean;
  conditions: Omit<AutomationCondition, "id" | "rule_id" | "created_at">[];
  actions: Omit<AutomationAction, "id" | "rule_id" | "created_at">[];
}

export interface UpdateRuleInput extends Partial<Omit<CreateRuleInput, "conditions" | "actions">> {
  id: string;
  conditions?: Omit<AutomationCondition, "id" | "rule_id" | "created_at">[];
  actions?: Omit<AutomationAction, "id" | "rule_id" | "created_at">[];
}

export function useAutomationRules() {
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useQuery({
    queryKey: ["automation_rules", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return [];

      const { data, error } = await workspaceClient
        .from("automation_rules")
        .select(`
          *,
          conditions:automation_conditions(*),
          actions:automation_actions(*)
        `)
        .eq("workspace_id", currentWorkspace.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as AutomationRule[];
    },
    enabled: !!currentWorkspace,
  });
}

export function useAutomationRule(id: string | undefined) {
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useQuery({
    queryKey: ["automation_rule", id],
    queryFn: async () => {
      if (!id || !currentWorkspace) return null;

      const { data, error } = await workspaceClient
        .from("automation_rules")
        .select(`
          *,
          conditions:automation_conditions(*),
          actions:automation_actions(*)
        `)
        .eq("id", id)
        .eq("workspace_id", currentWorkspace.id)
        .maybeSingle();

      if (error) throw error;
      return data as AutomationRule | null;
    },
    enabled: !!id && !!currentWorkspace,
  });
}

export function useCreateAutomationRule() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateRuleInput) => {
      if (!currentWorkspace || !user) throw new Error("Not authenticated");

      // Create rule
      const { data: rule, error: ruleError } = await workspaceClient
        .from("automation_rules")
        .insert({
          workspace_id: currentWorkspace.id,
          created_by: user.id,
          name: input.name,
          description: input.description || null,
          trigger: input.trigger as any,
          is_active: input.is_active ?? true,
        } as any)
        .select()
        .single();

      if (ruleError) throw ruleError;

      // Create conditions
      if (input.conditions.length > 0) {
        const { error: condError } = await workspaceClient
          .from("automation_conditions")
          .insert(
            input.conditions.map((c, i) => ({
              rule_id: rule.id,
              field_name: c.field_name,
              operator: c.operator,
              value: c.value,
              position: c.position ?? i,
            }))
          );
        if (condError) throw condError;
      }

      // Create actions
      if (input.actions.length > 0) {
        const { error: actError } = await workspaceClient
          .from("automation_actions")
          .insert(
            input.actions.map((a, i) => ({
              rule_id: rule.id,
              action_type: a.action_type,
              config: a.config as Record<string, never>,
              position: a.position ?? i,
            }))
          );
        if (actError) throw actError;
      }

      return rule as AutomationRule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automation_rules", currentWorkspace?.id] });
      toast.success("Regra criada com sucesso");
    },
    onError: (error) => {
      toast.error(`Erro ao criar regra: ${error.message}`);
    },
  });
}

export function useUpdateAutomationRule() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useMutation({
    mutationFn: async (input: UpdateRuleInput) => {
      const { id, conditions, actions, ...updates } = input;

      // Update rule
      if (Object.keys(updates).length > 0) {
        const { error: ruleError } = await workspaceClient
          .from("automation_rules")
          .update(updates as any)
          .eq("id", id);
        if (ruleError) throw ruleError;
      }

      // Replace conditions if provided
      if (conditions !== undefined) {
        await workspaceClient.from("automation_conditions").delete().eq("rule_id", id);
        if (conditions.length > 0) {
          const { error: condError } = await workspaceClient
            .from("automation_conditions")
            .insert(
              conditions.map((c, i) => ({
                rule_id: id,
                field_name: c.field_name,
                operator: c.operator,
                value: c.value,
                position: c.position ?? i,
              }))
            );
          if (condError) throw condError;
        }
      }

      // Replace actions if provided
      if (actions !== undefined) {
        await workspaceClient.from("automation_actions").delete().eq("rule_id", id);
        if (actions.length > 0) {
          const { error: actError } = await workspaceClient
            .from("automation_actions")
            .insert(
              actions.map((a, i) => ({
                rule_id: id,
                action_type: a.action_type,
                config: a.config as Record<string, never>,
                position: a.position ?? i,
              }))
            );
          if (actError) throw actError;
        }
      }

      return { id };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["automation_rules", currentWorkspace?.id] });
      queryClient.invalidateQueries({ queryKey: ["automation_rule", data.id] });
      toast.success("Regra atualizada com sucesso");
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar regra: ${error.message}`);
    },
  });
}

export function useDeleteAutomationRule() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await workspaceClient.from("automation_rules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automation_rules", currentWorkspace?.id] });
      toast.success("Regra eliminada");
    },
    onError: (error) => {
      toast.error(`Erro ao eliminar regra: ${error.message}`);
    },
  });
}

export function useToggleAutomationRule() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await workspaceClient
        .from("automation_rules")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automation_rules", currentWorkspace?.id] });
    },
  });
}

export interface AutomationLogFilters {
  ruleId?: string;
  leadId?: string;
  opportunityId?: string;
  status?: ExecutionStatus;
}

export function useAutomationLogs(ruleId?: string) {
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useQuery({
    queryKey: ["automation_logs", currentWorkspace?.id, ruleId],
    queryFn: async () => {
      if (!currentWorkspace) return [];

      let query = workspaceClient
        .from("automation_logs")
        .select(`
          *,
          rule:automation_rules(id, name, trigger)
        `)
        .eq("workspace_id", currentWorkspace.id)
        .order("created_at", { ascending: false })
        .limit(200);

      if (ruleId) {
        query = query.eq("rule_id", ruleId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as (AutomationLog & { rule?: { id: string; name: string; trigger: string } })[];
    },
    enabled: !!currentWorkspace,
  });
}
