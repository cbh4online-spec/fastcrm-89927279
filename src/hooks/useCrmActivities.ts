import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

export type ActivityType = 
  | "message_sent" | "message_received"
  | "status_changed" | "stage_changed"
  | "opportunity_created" | "opportunity_updated" | "opportunity_won" | "opportunity_lost"
  | "lead_created" | "lead_updated" | "lead_contacted"
  | "task_created" | "task_completed"
  | "note_added" | "tag_added" | "tag_removed"
  | "assigned" | "automation_triggered"
  | "proposal_sent" | "proposal_viewed" | "proposal_accepted"
  | "followup_scheduled" | "followup_completed"
  | "custom";

export type EntityType = "lead" | "opportunity" | "contact" | "company" | "conversation";

export interface CrmActivity {
  id: string;
  workspace_id: string;
  entity_type: EntityType;
  entity_id: string;
  lead_id: string | null;
  opportunity_id: string | null;
  conversation_id: string | null;
  activity_type: ActivityType;
  title: string;
  description: string | null;
  metadata: Record<string, unknown>;
  performed_by: string | null;
  automation_rule_id: string | null;
  created_at: string;
}

export interface CreateActivityInput {
  entity_type: EntityType;
  entity_id: string;
  activity_type: ActivityType;
  title: string;
  description?: string;
  metadata?: Record<string, unknown>;
  lead_id?: string;
  opportunity_id?: string;
  conversation_id?: string;
  automation_rule_id?: string;
}

interface ActivityFilters {
  entity_type?: EntityType;
  entity_id?: string;
  lead_id?: string;
  opportunity_id?: string;
  conversation_id?: string;
  activity_type?: ActivityType | ActivityType[];
  limit?: number;
}

export function useCrmActivities(filters: ActivityFilters = {}) {
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["crm-activities", currentWorkspace?.id, filters],
    queryFn: async () => {
      if (!currentWorkspace) return [];

      let query = workspaceClient
        .from("crm_activities")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .order("created_at", { ascending: false });

      if (filters.entity_type) {
        query = query.eq("entity_type", filters.entity_type);
      }
      if (filters.entity_id) {
        query = query.eq("entity_id", filters.entity_id);
      }
      if (filters.lead_id) {
        query = query.eq("lead_id", filters.lead_id);
      }
      if (filters.opportunity_id) {
        query = query.eq("opportunity_id", filters.opportunity_id);
      }
      if (filters.conversation_id) {
        query = query.eq("conversation_id", filters.conversation_id);
      }
      if (filters.activity_type) {
        if (Array.isArray(filters.activity_type)) {
          query = query.in("activity_type", filters.activity_type);
        } else {
          query = query.eq("activity_type", filters.activity_type);
        }
      }
      if (filters.limit) {
        query = query.limit(filters.limit);
      } else {
        query = query.limit(50);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as CrmActivity[];
    },
    enabled: !!currentWorkspace,
  });

  // Subscribe to realtime updates
  useEffect(() => {
    if (!currentWorkspace) return;

    const channel = workspaceClient
      .channel(`crm-activities-${currentWorkspace.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "crm_activities",
          filter: `workspace_id=eq.${currentWorkspace.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["crm-activities", currentWorkspace.id] });
          // Also refresh related entities
          queryClient.invalidateQueries({ queryKey: ["leads", currentWorkspace.id] });
          queryClient.invalidateQueries({ queryKey: ["opportunities", currentWorkspace.id] });
        }
      )
      .subscribe();

    return () => {
      workspaceClient.removeChannel(channel);
    };
  }, [currentWorkspace, queryClient, workspaceClient]);

  return query;
}

export function useEntityActivities(entityType: EntityType, entityId: string | undefined) {
  return useCrmActivities({
    entity_type: entityType,
    entity_id: entityId,
    limit: 50,
  });
}

export function useLeadActivities(leadId: string | undefined) {
  return useCrmActivities({
    lead_id: leadId,
    limit: 50,
  });
}

export function useOpportunityActivities(opportunityId: string | undefined) {
  return useCrmActivities({
    opportunity_id: opportunityId,
    limit: 50,
  });
}

export function useConversationActivities(conversationId: string | undefined) {
  return useCrmActivities({
    conversation_id: conversationId,
    limit: 50,
  });
}

export function useCreateActivity() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateActivityInput) => {
      if (!currentWorkspace || !user) throw new Error("Not authenticated");

      const insertData = {
        workspace_id: currentWorkspace.id,
        entity_type: input.entity_type,
        entity_id: input.entity_id,
        activity_type: input.activity_type,
        title: input.title,
        description: input.description || null,
        metadata: input.metadata || {},
        lead_id: input.lead_id || null,
        opportunity_id: input.opportunity_id || null,
        conversation_id: input.conversation_id || null,
        automation_rule_id: input.automation_rule_id || null,
        performed_by: user.id,
      };

      const { data, error } = await workspaceClient
        .from("crm_activities")
        .insert(insertData as any)
        .select()
        .single();

      if (error) throw error;
      return data as CrmActivity;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-activities", currentWorkspace?.id] });
    },
  });
}

// Hook to log automation execution as activity
export function useLogAutomationActivity() {
  const createActivity = useCreateActivity();

  return async (
    automationRuleId: string,
    automationName: string,
    entityType: EntityType,
    entityId: string,
    conversationId?: string,
    leadId?: string
  ) => {
    return createActivity.mutateAsync({
      entity_type: entityType,
      entity_id: entityId,
      activity_type: "automation_triggered",
      title: `Automação executada: ${automationName}`,
      description: `A automação "${automationName}" foi acionada automaticamente.`,
      metadata: { automation_rule_id: automationRuleId },
      automation_rule_id: automationRuleId,
      conversation_id: conversationId,
      lead_id: leadId,
    });
  };
}
