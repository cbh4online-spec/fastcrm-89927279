import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export interface AskResultItem {
  id: string;
  title: string;
  subtitle?: string;
  value?: number;
  health_label?: string;
  stage?: string;
  link: string;
}

export interface AskResultAction {
  id: string;
  label: string;
  icon: string;
  type: "bulk_task" | "navigate" | "automation" | "bulk_move_stage" | "bulk_assign_owner" | "create_saved_view";
  payload?: Record<string, any>;
}

export interface AskResultMetric {
  label: string;
  value: string;
  trend?: "up" | "down" | "neutral";
}

export interface AskResultSuggestion {
  text: string;
  action: AskResultAction;
}

export interface AskStructuredQuery {
  filters: { field: string; op: string; value: any }[];
  sort: { field: string; dir: "asc" | "desc" }[];
  limit: number;
}

export interface AutomationPreview {
  name: string;
  trigger: string;
  trigger_config?: Record<string, any>;
  trigger_label: string;
  conditions: Array<{ field_name: string; operator: string; value: string | null }>;
  conditions_labels: string[];
  actions: Array<{ action_type: string; config: Record<string, any> }>;
  actions_labels: string[];
}

export interface AskResult {
  version: string;
  routed_via: "deterministic" | "llm";
  confidence: number;
  intent: string;
  object_type: "deals" | "contacts" | "companies";
  query: AskStructuredQuery;
  answer: {
    headline: string;
    subtext?: string;
  };
  actions_available: string[];
  items: AskResultItem[];
  actions: AskResultAction[];
  metric?: AskResultMetric;
  suggestion?: AskResultSuggestion;
  did_you_mean?: string[];
  automation_preview?: AutomationPreview;
  // Backward compat
  header?: string;
}

const BULK_CONFIRM_THRESHOLD = 10;

export function useAskFastCRM() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AskResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<AskResultAction | null>(null);
  const [isConfirmingAutomation, setIsConfirmingAutomation] = useState(false);
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const ask = useCallback(
    async (question: string) => {
      if (!currentWorkspace?.id || !question.trim()) return;
      setIsLoading(true);
      setError(null);
      setResult(null);
      setPendingAction(null);

      try {
        const { data, error: fnError } = await supabase.functions.invoke(
          "ask-fastcrm",
          {
            body: { question: question.trim() },
            headers: { "X-Workspace-Id": currentWorkspace.id },
          }
        );

        if (fnError) throw fnError;
        if (data?.error) throw new Error(data.error);

        setResult(data as AskResult);
      } catch (e: any) {
        const msg = e?.message || "Failed to process question";
        setError(msg);
        toast.error(msg);
      } finally {
        setIsLoading(false);
      }
    },
    [currentWorkspace?.id]
  );

  const clear = useCallback(() => {
    setResult(null);
    setError(null);
    setPendingAction(null);
  }, []);

  const confirmPendingAction = useCallback(() => {
    if (pendingAction) {
      executeActionInternal(pendingAction, true);
      setPendingAction(null);
    }
  }, [pendingAction]);

  const cancelPendingAction = useCallback(() => {
    setPendingAction(null);
  }, []);

  const executeActionInternal = useCallback(
    async (action: AskResultAction, skipConfirmation = false) => {
      if (!currentWorkspace?.id || !user?.id) return;

      if (!skipConfirmation) {
        const dealIds: string[] = action.payload?.deal_ids || [];
        const needsConfirmation =
          dealIds.length > BULK_CONFIRM_THRESHOLD &&
          ["bulk_task", "bulk_move_stage", "bulk_assign_owner"].includes(action.type);

        if (needsConfirmation) {
          setPendingAction(action);
          return;
        }
      }

      switch (action.type) {
        case "navigate": {
          const link = action.payload?.link || "/dashboard/opportunities";
          navigate(link);
          break;
        }
        case "automation": {
          const link = action.payload?.link || "/dashboard/automations?create=true";
          navigate(link);
          break;
        }
        case "bulk_task": {
          const dealIds: string[] = action.payload?.deal_ids || [];
          const taskTitle = action.payload?.task_title || "Follow up on deal";
          const priority = action.payload?.priority || "MEDIUM";

          if (dealIds.length === 0) {
            toast.info("No deals to create tasks for.");
            return;
          }

          try {
            const tasks = dealIds.map((dealId) => ({
              workspace_id: currentWorkspace.id,
              assigned_to: user.id,
              created_by: user.id,
              title: taskTitle,
              priority: priority.toLowerCase(),
              status: "pending",
              related_type: "opportunity",
              related_id: dealId,
              due_at: new Date(Date.now() + 2 * 86400000).toISOString(),
            }));

            const { error: insertError } = await supabase
              .from("tasks")
              .insert(tasks);

            if (insertError) throw insertError;

            toast.success(
              `${dealIds.length} task${dealIds.length !== 1 ? "s" : ""} created.`
            );
          } catch (e: any) {
            toast.error(e?.message || "Failed to create tasks");
          }
          break;
        }
        case "bulk_move_stage": {
          const dealIds: string[] = action.payload?.deal_ids || [];
          const targetStageId = action.payload?.target_stage_id;

          if (dealIds.length === 0) {
            toast.info("No deals to move.");
            return;
          }

          if (!targetStageId) {
            navigate("/dashboard/opportunities");
            toast.info("Select a target stage in the pipeline view.");
            return;
          }

          try {
            const { error: updateError } = await supabase
              .from("opportunities")
              .update({ stage_id: targetStageId })
              .in("id", dealIds);

            if (updateError) throw updateError;

            toast.success(`${dealIds.length} deal${dealIds.length !== 1 ? "s" : ""} moved.`);
          } catch (e: any) {
            toast.error(e?.message || "Failed to move deals");
          }
          break;
        }
        case "bulk_assign_owner": {
          const dealIds: string[] = action.payload?.deal_ids || [];
          const ownerId = action.payload?.owner_id;

          if (dealIds.length === 0) {
            toast.info("No deals to assign.");
            return;
          }

          if (!ownerId) {
            navigate("/dashboard/opportunities");
            toast.info("Select an owner in the pipeline view.");
            return;
          }

          try {
            const { error: updateError } = await supabase
              .from("opportunities")
              .update({ owner_id: ownerId })
              .in("id", dealIds);

            if (updateError) throw updateError;

            toast.success(`${dealIds.length} deal${dealIds.length !== 1 ? "s" : ""} reassigned.`);
          } catch (e: any) {
            toast.error(e?.message || "Failed to assign deals");
          }
          break;
        }
        case "create_saved_view": {
          try {
            const { error: insertError } = await supabase
              .from("core_object_views")
              .insert({
                workspace_id: currentWorkspace.id,
                object_id: action.payload?.object_type_id || "opportunity",
                name: action.payload?.view_name || "Ask FastCRM View",
                filters: action.payload?.filters || {},
                visible_fields: action.payload?.columns || [],
              });

            if (insertError) throw insertError;

            toast.success("View saved.");
          } catch (e: any) {
            toast.error(e?.message || "Failed to save view");
          }
          break;
        }
      }
    },
    [currentWorkspace?.id, user?.id, navigate]
  );

  const executeAction = useCallback(
    (action: AskResultAction) => executeActionInternal(action, false),
    [executeActionInternal]
  );

  const confirmAutomation = useCallback(
    async (preview: AutomationPreview) => {
      if (!currentWorkspace?.id || !user?.id) return;
      setIsConfirmingAutomation(true);

      try {
        // Map trigger_config to the format expected by automation_rules
        const triggerConfig: Record<string, any> = {};
        if (preview.trigger === "lead_no_response" && preview.trigger_config?.delay_days) {
          triggerConfig.no_response_hours = (preview.trigger_config.delay_days as number) * 24;
        }
        if (preview.trigger === "opportunity_stage_changed" && preview.trigger_config?.stage_name) {
          triggerConfig.stage_name = preview.trigger_config.stage_name;
        }

        // Create rule
        const { data: rule, error: ruleError } = await workspaceClient
          .from("automation_rules")
          .insert({
            workspace_id: currentWorkspace.id,
            created_by: user.id,
            name: preview.name,
            description: `Created via Ask FastCRM: ${preview.trigger_label}`,
            trigger: preview.trigger as any,
            trigger_config: triggerConfig,
            is_active: true,
          } as any)
          .select()
          .single();

        if (ruleError) throw ruleError;

        // Create conditions
        if (preview.conditions.length > 0) {
          const { error: condError } = await workspaceClient
            .from("automation_conditions")
            .insert(
              preview.conditions.map((c, i) => ({
                rule_id: rule.id,
                field_name: c.field_name,
                operator: c.operator as any,
                value: c.value,
                position: i,
              }))
            );
          if (condError) throw condError;
        }

        // Create actions
        if (preview.actions.length > 0) {
          const { error: actError } = await workspaceClient
            .from("automation_actions")
            .insert(
              preview.actions.map((a, i) => ({
                rule_id: rule.id,
                action_type: a.action_type as any,
                config: a.config as Record<string, never>,
                position: i,
              }))
            );
          if (actError) throw actError;
        }

        queryClient.invalidateQueries({ queryKey: ["automation_rules", currentWorkspace.id] });
        toast.success("Rule activated — it will run automatically.");
        setResult(null);
      } catch (e: any) {
        toast.error(e?.message || "Failed to create automation rule");
      } finally {
        setIsConfirmingAutomation(false);
      }
    },
    [currentWorkspace?.id, user?.id, workspaceClient, queryClient]
  );

  const cancelAutomation = useCallback(() => {
    setResult(null);
  }, []);

  return {
    isLoading,
    result,
    error,
    ask,
    clear,
    executeAction,
    pendingAction,
    confirmPendingAction,
    cancelPendingAction,
    confirmAutomation,
    cancelAutomation,
    isConfirmingAutomation,
  };
}
