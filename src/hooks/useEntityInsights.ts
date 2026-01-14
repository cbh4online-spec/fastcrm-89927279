import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";
import { supabase } from "@/integrations/supabase/client";

export interface EntityKPIs {
  messagesCount: number;
  messagesLast30Days: number;
  lastInteractionDate: string | null;
  openActivitiesCount: number;
  closedActivitiesCount: number;
  opportunitiesCount: number;
  totalOpenDealValue: number;
  meetingsHeld: number;
  campaignInteractions: number;
  paymentsCount: number;
  totalPaymentsValue: number;
  filesCount: number;
  notesCount: number;
  emailsCount: number;
  socialInteractionsCount: number;
}

export interface EntityRelatedCounts {
  notes: number;
  messages: number;
  openActivities: number;
  closedActivities: number;
  meetings: number;
  opportunities: number;
  campaigns: number;
  emails: number;
  socialInteractions: number;
  payments: number;
  files: number;
}

export interface AIInsight {
  summary: string;
  nextAction: string | null;
  warnings: string[];
  lastGenerated: string | null;
}

export function useEntityKPIs(entityType: "lead" | "contact", entityId: string | undefined) {
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useQuery({
    queryKey: ["entity_kpis", entityType, entityId, currentWorkspace?.id],
    queryFn: async (): Promise<EntityKPIs> => {
      if (!entityId || !currentWorkspace?.id) {
        return getEmptyKPIs();
      }

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Fetch related data in parallel
      const [
        conversationsResult,
        messagesResult,
        tasksResult,
        opportunitiesResult,
        paymentsResult,
      ] = await Promise.all([
        // Conversations linked to this entity
        workspaceClient
          .from("conversations")
          .select("id, last_message_at")
          .eq("workspace_id", currentWorkspace.id)
          .eq("lead_id", entityId),
        // Messages from conversations (we'll filter after)
        workspaceClient
          .from("messages")
          .select("id, sent_at, conversation_id")
          .eq("workspace_id", currentWorkspace.id)
          .order("sent_at", { ascending: false })
          .limit(500),
        // Tasks related to this entity
        workspaceClient
          .from("tasks")
          .select("id, status, title")
          .eq("workspace_id", currentWorkspace.id)
          .eq("related_type", entityType)
          .eq("related_id", entityId),
        // Opportunities linked to this lead
        entityType === "lead"
          ? workspaceClient
              .from("opportunities")
              .select("id, value, status")
              .eq("workspace_id", currentWorkspace.id)
              .eq("lead_id", entityId)
          : Promise.resolve({ data: [], error: null }),
        // Payments from opportunities (will need filtering)
        workspaceClient
          .from("payments")
          .select("id, amount, status, opportunity_id")
          .eq("workspace_id", currentWorkspace.id),
      ]);

      const conversations = conversationsResult.data || [];
      const conversationIds = conversations.map((c) => c.id);
      const allMessages = messagesResult.data || [];
      const tasks = tasksResult.data || [];
      const opportunities = opportunitiesResult.data || [];
      const allPayments = paymentsResult.data || [];

      // Filter messages for this entity's conversations
      const entityMessages = allMessages.filter((m) =>
        conversationIds.includes(m.conversation_id)
      );

      // Messages in last 30 days
      const messagesLast30Days = entityMessages.filter(
        (m) => new Date(m.sent_at) >= thirtyDaysAgo
      ).length;

      // Last interaction date
      const lastMessageDate = entityMessages.length > 0 
        ? entityMessages[0].sent_at 
        : null;
      const lastConversationDate = conversations.length > 0 
        ? conversations.reduce((latest, c) => 
            c.last_message_at && (!latest || c.last_message_at > latest) 
              ? c.last_message_at 
              : latest, 
            null as string | null
          )
        : null;
      const lastInteractionDate = lastMessageDate || lastConversationDate;

      // Tasks
      const openActivities = tasks.filter((t) => t.status !== "done").length;
      const closedActivities = tasks.filter((t) => t.status === "done").length;

      // Opportunities
      const openOpportunities = opportunities.filter(
        (o) => o.status !== "won" && o.status !== "lost"
      );
      const totalOpenDealValue = openOpportunities.reduce(
        (sum, o) => sum + (o.value || 0),
        0
      );

      // Payments for this entity's opportunities
      const opportunityIds = opportunities.map((o) => o.id);
      const entityPayments = allPayments.filter((p) =>
        opportunityIds.includes(p.opportunity_id)
      );
      const completedPayments = entityPayments.filter((p) => p.status === "completed");

      return {
        messagesCount: entityMessages.length,
        messagesLast30Days,
        lastInteractionDate,
        openActivitiesCount: openActivities,
        closedActivitiesCount: closedActivities,
        opportunitiesCount: opportunities.length,
        totalOpenDealValue,
        meetingsHeld: 0, // Would need meetings table
        campaignInteractions: 0, // Would need campaigns table
        paymentsCount: completedPayments.length,
        totalPaymentsValue: completedPayments.reduce((sum, p) => sum + p.amount, 0),
        filesCount: 0, // Would need files/attachments table
        notesCount: 0, // Notes stored in entity.notes field
        emailsCount: 0, // Would need email integration
        socialInteractionsCount: conversations.filter(
          (c) => c.id // All conversations count as social for now
        ).length,
      };
    },
    enabled: !!entityId && !!currentWorkspace?.id,
    staleTime: 30000, // 30 seconds
  });
}

export function useEntityRelatedCounts(
  entityType: "lead" | "contact",
  entityId: string | undefined
) {
  const { data: kpis } = useEntityKPIs(entityType, entityId);

  const counts: EntityRelatedCounts = {
    notes: kpis?.notesCount || 0,
    messages: kpis?.messagesCount || 0,
    openActivities: kpis?.openActivitiesCount || 0,
    closedActivities: kpis?.closedActivitiesCount || 0,
    meetings: kpis?.meetingsHeld || 0,
    opportunities: kpis?.opportunitiesCount || 0,
    campaigns: kpis?.campaignInteractions || 0,
    emails: kpis?.emailsCount || 0,
    socialInteractions: kpis?.socialInteractionsCount || 0,
    payments: kpis?.paymentsCount || 0,
    files: kpis?.filesCount || 0,
  };

  return counts;
}

export function useEntityAIInsights(
  entityType: "lead" | "contact",
  entityId: string | undefined,
  entityData: {
    name: string;
    status?: string;
    source?: string;
    tags?: string[];
    notes?: string;
  } | null
) {
  const { currentWorkspace } = useWorkspace();
  const { data: kpis } = useEntityKPIs(entityType, entityId);

  return useQuery({
    queryKey: ["entity_ai_insights", entityType, entityId, currentWorkspace?.id],
    queryFn: async (): Promise<AIInsight> => {
      if (!entityId || !entityData || !kpis) {
        return getEmptyInsight();
      }

      // Generate insights from available data
      const warnings: string[] = [];
      let nextAction: string | null = null;
      let summary = "";

      // Check for warnings
      if (kpis.openActivitiesCount > 0) {
        warnings.push(`${kpis.openActivitiesCount} atividade${kpis.openActivitiesCount > 1 ? "s" : ""} pendente${kpis.openActivitiesCount > 1 ? "s" : ""}`);
      }

      if (kpis.lastInteractionDate) {
        const daysSinceInteraction = Math.floor(
          (Date.now() - new Date(kpis.lastInteractionDate).getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysSinceInteraction > 14) {
          warnings.push(`Sem interação há ${daysSinceInteraction} dias`);
        }
      } else {
        warnings.push("Nenhuma interação registada");
      }

      // Determine suggested next action
      if (kpis.messagesCount === 0) {
        nextAction = "Enviar primeira mensagem de contacto";
      } else if (kpis.openActivitiesCount === 0 && kpis.opportunitiesCount === 0) {
        nextAction = "Criar oportunidade ou agendar follow-up";
      } else if (kpis.opportunitiesCount > 0 && kpis.totalOpenDealValue > 0) {
        nextAction = `Avançar negócio de €${kpis.totalOpenDealValue.toLocaleString()}`;
      } else if (kpis.openActivitiesCount > 0) {
        nextAction = "Completar atividades pendentes";
      }

      // Generate summary
      const parts: string[] = [];
      
      if (entityData.source) {
        parts.push(`Origem: ${entityData.source}`);
      }
      
      if (kpis.messagesLast30Days > 0) {
        parts.push(`${kpis.messagesLast30Days} msg últimos 30 dias`);
      }
      
      if (kpis.opportunitiesCount > 0) {
        parts.push(`${kpis.opportunitiesCount} oportunidade${kpis.opportunitiesCount > 1 ? "s" : ""}`);
      }
      
      if (kpis.totalPaymentsValue > 0) {
        parts.push(`€${kpis.totalPaymentsValue.toLocaleString()} em pagamentos`);
      }

      summary = parts.length > 0 
        ? parts.join(" • ") 
        : "Sem dados suficientes para resumo";

      return {
        summary,
        nextAction,
        warnings,
        lastGenerated: new Date().toISOString(),
      };
    },
    enabled: !!entityId && !!entityData && !!kpis,
    staleTime: 60000, // 1 minute
  });
}

function getEmptyKPIs(): EntityKPIs {
  return {
    messagesCount: 0,
    messagesLast30Days: 0,
    lastInteractionDate: null,
    openActivitiesCount: 0,
    closedActivitiesCount: 0,
    opportunitiesCount: 0,
    totalOpenDealValue: 0,
    meetingsHeld: 0,
    campaignInteractions: 0,
    paymentsCount: 0,
    totalPaymentsValue: 0,
    filesCount: 0,
    notesCount: 0,
    emailsCount: 0,
    socialInteractionsCount: 0,
  };
}

function getEmptyInsight(): AIInsight {
  return {
    summary: "",
    nextAction: null,
    warnings: [],
    lastGenerated: null,
  };
}
