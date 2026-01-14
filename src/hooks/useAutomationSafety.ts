import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";
import { toast } from "sonner";
import { AutomationState, RateLimitConfig, DEFAULT_RATE_LIMITS } from "@/lib/automationSafety";

// Hook to check if automations are globally paused
export function useAutomationGlobalPause() {
  const { workspaceClient } = useWorkspaceInstance();

  return useQuery({
    queryKey: ["automation_global_pause"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_settings")
        .select("value")
        .eq("key", "automations_global_pause")
        .maybeSingle();

      if (error) throw error;
      return data?.value === true || data?.value === "true";
    },
  });
}

// Hook to toggle global pause
export function useToggleGlobalPause() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (paused: boolean) => {
      const { error } = await supabase
        .from("admin_settings")
        .update({ value: paused })
        .eq("key", "automations_global_pause");

      if (error) throw error;
      return paused;
    },
    onSuccess: (paused) => {
      queryClient.invalidateQueries({ queryKey: ["automation_global_pause"] });
      toast.success(paused ? "Automações pausadas globalmente" : "Automações retomadas");
    },
    onError: (error) => {
      toast.error(`Erro ao alterar estado: ${error.message}`);
    },
  });
}

// Hook to get rate limit configuration
export function useRateLimitConfig() {
  return useQuery({
    queryKey: ["automation_rate_limits"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_settings")
        .select("value")
        .eq("key", "automation_rate_limits")
        .maybeSingle();

      if (error) throw error;
      
      if (!data?.value || typeof data.value !== 'object') {
        return DEFAULT_RATE_LIMITS;
      }
      
      const value = data.value as Record<string, unknown>;
      return {
        max_per_entity_per_hour: (value.max_per_entity_per_hour as number) || DEFAULT_RATE_LIMITS.max_per_entity_per_hour,
        max_chain_depth: (value.max_chain_depth as number) || DEFAULT_RATE_LIMITS.max_chain_depth,
        window_minutes: (value.window_minutes as number) || DEFAULT_RATE_LIMITS.window_minutes,
      } as RateLimitConfig;
    },
  });
}

// Hook to update automation state
export function useUpdateAutomationState() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useMutation({
    mutationFn: async ({ ruleId, state }: { ruleId: string; state: AutomationState }) => {
      // Also update is_active based on state for backwards compatibility
      const is_active = state === "active";
      
      const { error } = await workspaceClient
        .from("automation_rules")
        .update({ state, is_active })
        .eq("id", ruleId);

      if (error) throw error;
      return { ruleId, state };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["automation_rules", currentWorkspace?.id] });
      queryClient.invalidateQueries({ queryKey: ["automation_rule", data.ruleId] });
      
      const stateLabels: Record<AutomationState, string> = {
        draft: "Rascunho",
        active: "Ativa",
        paused: "Pausada",
        error: "Erro",
      };
      toast.success(`Estado da automação alterado para: ${stateLabels[data.state]}`);
    },
    onError: (error) => {
      toast.error(`Erro ao alterar estado: ${error.message}`);
    },
  });
}

// Hook to get execution tracking for rate limiting info
export function useExecutionTracking(ruleId?: string) {
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useQuery({
    queryKey: ["execution_tracking", currentWorkspace?.id, ruleId],
    queryFn: async () => {
      if (!currentWorkspace) return [];

      let query = workspaceClient
        .from("automation_execution_tracking" as never)
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .gte("window_start", new Date(Date.now() - 60 * 60 * 1000).toISOString());

      if (ruleId) {
        query = query.eq("rule_id", ruleId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Array<{
        id: string;
        rule_id: string;
        entity_type: string;
        entity_id: string;
        execution_count: number;
        window_start: string;
      }>;
    },
    enabled: !!currentWorkspace,
  });
}

// Hook to check entity rate limit before execution
export function useCheckEntityRateLimit() {
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();
  const { data: rateLimits } = useRateLimitConfig();

  return useMutation({
    mutationFn: async ({ 
      ruleId, 
      entityType, 
      entityId 
    }: { 
      ruleId: string; 
      entityType: string; 
      entityId: string;
    }) => {
      if (!currentWorkspace) throw new Error("No workspace");

      // Check current execution count
      const { data, error } = await workspaceClient
        .from("automation_execution_tracking")
        .select("execution_count, window_start")
        .eq("rule_id", ruleId)
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .maybeSingle();

      if (error) throw error;

      const maxPerHour = rateLimits?.max_per_entity_per_hour || DEFAULT_RATE_LIMITS.max_per_entity_per_hour;
      const windowMinutes = rateLimits?.window_minutes || DEFAULT_RATE_LIMITS.window_minutes;

      // Check if within rate limit window
      if (data) {
        const windowStart = new Date(data.window_start);
        const windowEnd = new Date(windowStart.getTime() + windowMinutes * 60 * 1000);
        const now = new Date();

        if (now < windowEnd && data.execution_count >= maxPerHour) {
          return {
            allowed: false,
            reason: `Limite de ${maxPerHour} execuções por hora atingido`,
            currentCount: data.execution_count,
            maxCount: maxPerHour,
          };
        }
      }

      return {
        allowed: true,
        currentCount: data?.execution_count || 0,
        maxCount: maxPerHour,
      };
    },
  });
}

// Hook to record an execution
export function useRecordExecution() {
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      ruleId, 
      entityType, 
      entityId 
    }: { 
      ruleId: string; 
      entityType: string; 
      entityId: string;
    }) => {
      if (!currentWorkspace) throw new Error("No workspace");

      // First try to update existing record
      const { data: existing } = await workspaceClient
        .from("automation_execution_tracking" as never)
        .select("id, execution_count")
        .eq("rule_id", ruleId)
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .maybeSingle();

      if (existing) {
        // Update existing record
        await workspaceClient
          .from("automation_execution_tracking" as never)
          .update({ 
            execution_count: ((existing as { execution_count: number }).execution_count || 0) + 1,
            last_execution_at: new Date().toISOString(),
          } as never)
          .eq("id", (existing as { id: string }).id);
      } else {
        // Insert new record
        await workspaceClient
          .from("automation_execution_tracking" as never)
          .insert({
            workspace_id: currentWorkspace.id,
            rule_id: ruleId,
            entity_type: entityType,
            entity_id: entityId,
            execution_count: 1,
            window_start: new Date().toISOString(),
            last_execution_at: new Date().toISOString(),
          } as never);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["execution_tracking"] });
    },
  });
}

// Hook to check for Stripe event idempotency
export function useCheckStripeIdempotency() {
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useMutation({
    mutationFn: async (stripeEventId: string) => {
      if (!currentWorkspace) throw new Error("No workspace");

      const { data, error } = await workspaceClient
        .from("stripe_event_log" as never)
        .select("id")
        .eq("stripe_event_id", stripeEventId)
        .maybeSingle();

      if (error) throw error;
      
      return {
        alreadyProcessed: !!data,
        eventId: stripeEventId,
      };
    },
  });
}

// Hook to record Stripe event
export function useRecordStripeEvent() {
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useMutation({
    mutationFn: async ({ 
      stripeEventId, 
      eventType, 
      payload 
    }: { 
      stripeEventId: string; 
      eventType: string; 
      payload?: Record<string, unknown>;
    }) => {
      if (!currentWorkspace) throw new Error("No workspace");

      await workspaceClient
        .from("stripe_event_log" as never)
        .insert({
          workspace_id: currentWorkspace.id,
          stripe_event_id: stripeEventId,
          event_type: eventType,
          payload: payload || null,
        } as never);
    },
  });
}
