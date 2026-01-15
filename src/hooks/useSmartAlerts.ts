import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";
import { useAuth } from "@/contexts/AuthContext";
import { differenceInHours, differenceInDays } from "date-fns";

export type AlertType =
  | "hot_no_reply"
  | "proposal_multi_view"
  | "client_inactive"
  | "opportunity_stalled"
  | "high_intent_waiting"
  | "followup_overdue"
  | "proposal_expiring";

export type AlertSeverity = "low" | "medium" | "high" | "critical";

export interface SmartAlert {
  id: string;
  workspace_id: string;
  conversation_id: string | null;
  lead_id: string | null;
  opportunity_id: string | null;
  proposal_id: string | null;
  alert_type: AlertType;
  severity: AlertSeverity;
  title: string;
  description: string;
  action_label: string | null;
  action_url: string | null;
  context_data: Record<string, unknown>;
  is_read: boolean;
  is_dismissed: boolean;
  is_actioned: boolean;
  actioned_at: string | null;
  actioned_by: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AlertDetectionContext {
  conversationId?: string;
  leadId?: string;
  hoursSinceLastMessage?: number;
  temperatureScore?: number;
  proposalViewCount?: number;
  proposalTitle?: string;
  opportunityValue?: number;
  leadName?: string;
  channel?: string;
}

// Alert type configurations
export const ALERT_CONFIGS: Record<
  AlertType,
  {
    icon: string;
    color: string;
    bgColor: string;
    borderColor: string;
  }
> = {
  hot_no_reply: {
    icon: "🔥",
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-50 dark:bg-red-900/20",
    borderColor: "border-red-200 dark:border-red-800",
  },
  proposal_multi_view: {
    icon: "👀",
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-50 dark:bg-purple-900/20",
    borderColor: "border-purple-200 dark:border-purple-800",
  },
  client_inactive: {
    icon: "😴",
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-50 dark:bg-amber-900/20",
    borderColor: "border-amber-200 dark:border-amber-800",
  },
  opportunity_stalled: {
    icon: "⏸️",
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-50 dark:bg-orange-900/20",
    borderColor: "border-orange-200 dark:border-orange-800",
  },
  high_intent_waiting: {
    icon: "⚡",
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-50 dark:bg-emerald-900/20",
    borderColor: "border-emerald-200 dark:border-emerald-800",
  },
  followup_overdue: {
    icon: "⏰",
    color: "text-rose-600 dark:text-rose-400",
    bgColor: "bg-rose-50 dark:bg-rose-900/20",
    borderColor: "border-rose-200 dark:border-rose-800",
  },
  proposal_expiring: {
    icon: "📋",
    color: "text-indigo-600 dark:text-indigo-400",
    bgColor: "bg-indigo-50 dark:bg-indigo-900/20",
    borderColor: "border-indigo-200 dark:border-indigo-800",
  },
};

// Fetch active alerts
export function useSmartAlerts(limit?: number) {
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useQuery({
    queryKey: ["smart_alerts", currentWorkspace?.id, limit],
    queryFn: async () => {
      if (!currentWorkspace) return [];

      let query = workspaceClient
        .from("inbox_smart_alerts")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .eq("is_dismissed", false)
        .eq("is_actioned", false)
        .order("severity", { ascending: false })
        .order("created_at", { ascending: false });

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Filter out expired alerts
      const now = new Date();
      const activeAlerts = (data as SmartAlert[]).filter(
        (alert) => !alert.expires_at || new Date(alert.expires_at) > now
      );

      return activeAlerts;
    },
    enabled: !!currentWorkspace,
    refetchInterval: 60000, // Refresh every minute
  });
}

// Get unread alert count
export function useUnreadAlertCount() {
  const { data: alerts } = useSmartAlerts();
  return alerts?.filter((a) => !a.is_read).length || 0;
}

// Mark alert as read
export function useMarkAlertRead() {
  const queryClient = useQueryClient();
  const { workspaceClient } = useWorkspaceInstance();

  return useMutation({
    mutationFn: async (alertId: string) => {
      const { data, error } = await workspaceClient
        .from("inbox_smart_alerts")
        .update({ is_read: true })
        .eq("id", alertId)
        .select()
        .single();

      if (error) throw error;
      return data as SmartAlert;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["smart_alerts"] });
    },
  });
}

// Dismiss alert
export function useDismissAlert() {
  const queryClient = useQueryClient();
  const { workspaceClient } = useWorkspaceInstance();

  return useMutation({
    mutationFn: async (alertId: string) => {
      const { data, error } = await workspaceClient
        .from("inbox_smart_alerts")
        .update({ is_dismissed: true })
        .eq("id", alertId)
        .select()
        .single();

      if (error) throw error;
      return data as SmartAlert;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["smart_alerts"] });
    },
  });
}

// Mark alert as actioned
export function useActionAlert() {
  const queryClient = useQueryClient();
  const { workspaceClient } = useWorkspaceInstance();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (alertId: string) => {
      const { data, error } = await workspaceClient
        .from("inbox_smart_alerts")
        .update({
          is_actioned: true,
          actioned_at: new Date().toISOString(),
          actioned_by: user?.id,
        })
        .eq("id", alertId)
        .select()
        .single();

      if (error) throw error;
      return data as SmartAlert;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["smart_alerts"] });
    },
  });
}

// Create a new alert
export function useCreateAlert() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useMutation({
    mutationFn: async (
      alert: {
        conversation_id: string | null;
        lead_id: string | null;
        opportunity_id: string | null;
        proposal_id: string | null;
        alert_type: AlertType;
        severity: AlertSeverity;
        title: string;
        description: string;
        action_label: string | null;
        action_url: string | null;
        context_data: Record<string, unknown>;
        expires_at: string | null;
      }
    ) => {
      if (!currentWorkspace) throw new Error("No workspace");

      // Check for duplicate alerts (same type + conversation/lead within 24h)
      const { data: existing } = await workspaceClient
        .from("inbox_smart_alerts")
        .select("id")
        .eq("workspace_id", currentWorkspace.id)
        .eq("alert_type", alert.alert_type)
        .eq("conversation_id", alert.conversation_id)
        .eq("is_dismissed", false)
        .eq("is_actioned", false)
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .limit(1);

      if (existing && existing.length > 0) {
        // Update existing instead of creating duplicate
        const { data, error } = await workspaceClient
          .from("inbox_smart_alerts")
          .update({
            title: alert.title,
            description: alert.description,
            context_data: alert.context_data as unknown as Record<string, never>,
            severity: alert.severity,
          })
          .eq("id", existing[0].id)
          .select()
          .single();

        if (error) throw error;
        return data as SmartAlert;
      }

      const { data, error } = await workspaceClient
        .from("inbox_smart_alerts")
        .insert({
          workspace_id: currentWorkspace.id,
          conversation_id: alert.conversation_id,
          lead_id: alert.lead_id,
          opportunity_id: alert.opportunity_id,
          proposal_id: alert.proposal_id,
          alert_type: alert.alert_type,
          severity: alert.severity,
          title: alert.title,
          description: alert.description,
          action_label: alert.action_label,
          action_url: alert.action_url,
          context_data: alert.context_data as unknown as Record<string, never>,
          expires_at: alert.expires_at,
        })
        .select()
        .single();

      if (error) throw error;
      return data as SmartAlert;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["smart_alerts"] });
    },
  });
}

// Alert detection utilities
export function detectAlerts(context: {
  conversations?: Array<{
    id: string;
    lead_id: string | null;
    lead_name?: string;
    last_message_at: string | null;
    status: string;
    temperature_score?: number;
    last_outbound_at?: string;
    ai_tags?: string[];
  }>;
  proposals?: Array<{
    id: string;
    title: string;
    views_count: number;
    opportunity_id: string;
    expires_at: string | null;
    status: string;
  }>;
  opportunities?: Array<{
    id: string;
    title: string;
    lead_id: string | null;
    updated_at: string;
    status: string;
    value: number | null;
  }>;
  leads?: Array<{
    id: string;
    name: string;
    last_contact_at: string | null;
    status: string;
  }>;
}): Array<Omit<SmartAlert, "id" | "workspace_id" | "created_at" | "updated_at" | "is_read" | "is_dismissed" | "is_actioned" | "actioned_at" | "actioned_by">> {
  const alerts: Array<Omit<SmartAlert, "id" | "workspace_id" | "created_at" | "updated_at" | "is_read" | "is_dismissed" | "is_actioned" | "actioned_at" | "actioned_by">> = [];
  const now = new Date();

  // 1. Hot conversations without reply
  context.conversations?.forEach((conv) => {
    if (conv.status !== "open") return;
    if (!conv.last_message_at) return;

    const hoursSince = differenceInHours(now, new Date(conv.last_message_at));
    const isHot = (conv.temperature_score || 0) >= 60;
    const hasHighIntent = conv.ai_tags?.includes("Alta Intenção");

    if ((isHot || hasHighIntent) && hoursSince >= 4 && hoursSince < 48) {
      alerts.push({
        conversation_id: conv.id,
        lead_id: conv.lead_id,
        opportunity_id: null,
        proposal_id: null,
        alert_type: "hot_no_reply",
        severity: hoursSince >= 12 ? "high" : "medium",
        title: `Conversa quente aguardando`,
        description: `${conv.lead_name || "Lead"} não recebeu resposta há ${hoursSince}h`,
        action_label: "Responder agora",
        action_url: `/dashboard/inbox?conversation=${conv.id}`,
        context_data: {
          hoursSince,
          temperatureScore: conv.temperature_score,
          leadName: conv.lead_name,
        },
        expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      });
    }

    // High intent waiting
    if (hasHighIntent && hoursSince >= 2 && hoursSince < 24) {
      alerts.push({
        conversation_id: conv.id,
        lead_id: conv.lead_id,
        opportunity_id: null,
        proposal_id: null,
        alert_type: "high_intent_waiting",
        severity: "high",
        title: `Lead com alta intenção esperando`,
        description: `${conv.lead_name || "Lead"} mostrou interesse forte há ${hoursSince}h`,
        action_label: "Responder",
        action_url: `/dashboard/inbox?conversation=${conv.id}`,
        context_data: { hoursSince, leadName: conv.lead_name },
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });
    }
  });

  // 2. Proposals viewed multiple times without reply
  context.proposals?.forEach((proposal) => {
    if (proposal.status !== "published") return;
    if (proposal.views_count >= 3) {
      alerts.push({
        conversation_id: null,
        lead_id: null,
        opportunity_id: proposal.opportunity_id,
        proposal_id: proposal.id,
        alert_type: "proposal_multi_view",
        severity: proposal.views_count >= 5 ? "high" : "medium",
        title: `Proposta vista ${proposal.views_count}x`,
        description: `"${proposal.title}" foi visualizada várias vezes sem resposta`,
        action_label: "Ver proposta",
        action_url: `/dashboard/proposals?id=${proposal.id}`,
        context_data: { viewCount: proposal.views_count, proposalTitle: proposal.title },
        expires_at: null,
      });
    }

    // Proposal expiring soon
    if (proposal.expires_at) {
      const daysUntilExpiry = differenceInDays(new Date(proposal.expires_at), now);
      if (daysUntilExpiry <= 3 && daysUntilExpiry > 0) {
        alerts.push({
          conversation_id: null,
          lead_id: null,
          opportunity_id: proposal.opportunity_id,
          proposal_id: proposal.id,
          alert_type: "proposal_expiring",
          severity: daysUntilExpiry <= 1 ? "critical" : "medium",
          title: `Proposta expira em ${daysUntilExpiry} dia(s)`,
          description: `"${proposal.title}" precisa de atenção`,
          action_label: "Ver proposta",
          action_url: `/dashboard/proposals?id=${proposal.id}`,
          context_data: { daysUntilExpiry, proposalTitle: proposal.title },
          expires_at: proposal.expires_at,
        });
      }
    }
  });

  // 3. Client inactive for X days
  context.leads?.forEach((lead) => {
    if (lead.status !== "client") return;
    if (!lead.last_contact_at) return;

    const daysSinceContact = differenceInDays(now, new Date(lead.last_contact_at));
    if (daysSinceContact >= 30 && daysSinceContact < 90) {
      alerts.push({
        conversation_id: null,
        lead_id: lead.id,
        opportunity_id: null,
        proposal_id: null,
        alert_type: "client_inactive",
        severity: daysSinceContact >= 60 ? "high" : "medium",
        title: `Cliente inativo há ${daysSinceContact} dias`,
        description: `${lead.name} não teve contato recente`,
        action_label: "Reengajar",
        action_url: `/dashboard/leads/${lead.id}`,
        context_data: { daysSinceContact, leadName: lead.name },
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });
    }
  });

  // 4. Opportunity stalled
  context.opportunities?.forEach((opp) => {
    if (opp.status !== "open") return;

    const daysSinceUpdate = differenceInDays(now, new Date(opp.updated_at));
    if (daysSinceUpdate >= 7 && daysSinceUpdate < 30) {
      alerts.push({
        conversation_id: null,
        lead_id: opp.lead_id,
        opportunity_id: opp.id,
        proposal_id: null,
        alert_type: "opportunity_stalled",
        severity: daysSinceUpdate >= 14 ? "high" : "medium",
        title: `Oportunidade parada há ${daysSinceUpdate} dias`,
        description: `"${opp.title}" ${opp.value ? `(R$ ${opp.value.toLocaleString()})` : ""} precisa de movimento`,
        action_label: "Ver oportunidade",
        action_url: `/dashboard/opportunities?id=${opp.id}`,
        context_data: { daysSinceUpdate, opportunityTitle: opp.title, value: opp.value },
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });
    }
  });

  return alerts;
}
