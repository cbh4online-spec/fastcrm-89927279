import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLeads } from "./useLeads";
import { useContacts } from "./useContacts";
import { useCompanies } from "./useCompanies";
import { useOpportunities } from "./useOpportunities";
import { useProposals } from "./useProposals";
import { usePipelineStages } from "./usePipelineStages";
import { useTasks } from "./useTasks";
import { useConversations } from "./useConversations";
import { useAutomationRules } from "./useAutomations";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay, subDays, isAfter, isBefore, differenceInDays, differenceInHours } from "date-fns";
import { toast } from "sonner";

export interface OperationalKPIs {
  leadsToday: number;
  hotLeads: number;
  conversationsWithoutResponse: number;
  activeOpportunities: number;
  forecastedRevenue: number;
  avgResponseTimeHours: number;
  leadsWithoutFollowup: number;
  activeAutomations: number;
}

export interface PipelineSummary {
  totalValue: number;
  opportunityCount: number;
  mostCongestedStage: { name: string; count: number } | null;
  stages: Array<{
    id: string;
    name: string;
    color: string;
    count: number;
    value: number;
  }>;
}

export interface EfficiencyMetrics {
  avgResponseTimeHours: number;
  leadsWithoutFollowup: number;
  activeAutomations: number;
  estimatedTimeSavedHours: number;
}

export interface AIInsight {
  id: string;
  type: "urgent" | "opportunity" | "efficiency" | "warning";
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  actionLabel: string;
  actionRoute: string;
  entityName?: string;
}

export interface NextAction {
  id: string;
  type: "lead" | "inbox" | "opportunity" | "task";
  priority: "high" | "medium" | "low";
  title: string;
  reason: string;
  actionRoute: string;
}

export interface DashboardAIResponse {
  greeting: string;
  dayStatus: string;
  insights: AIInsight[];
  nextActions: NextAction[];
  efficiencyMetrics: {
    timeSavedHours: number;
    responseImprovement?: string;
  };
}

export function useOperationalDashboard() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  
  const { data: leads, isLoading: leadsLoading } = useLeads();
  const { contacts, isLoading: contactsLoading } = useContacts();
  const { companies, isLoading: companiesLoading } = useCompanies();
  const { data: opportunities, isLoading: opportunitiesLoading } = useOpportunities();
  const { data: proposals, isLoading: proposalsLoading } = useProposals();
  const { data: stages, isLoading: stagesLoading } = usePipelineStages();
  const { data: tasks, isLoading: tasksLoading } = useTasks();
  const { data: conversations, isLoading: conversationsLoading } = useConversations();
  const { data: automations, isLoading: automationsLoading } = useAutomationRules();

  const isLoading = leadsLoading || contactsLoading || companiesLoading || 
    opportunitiesLoading || proposalsLoading || stagesLoading || tasksLoading || 
    conversationsLoading || automationsLoading;

  // Calculate operational KPIs
  const kpis = useMemo<OperationalKPIs | null>(() => {
    if (isLoading) return null;

    const now = new Date();
    const today = startOfDay(now);
    const dayAgo = subDays(now, 1);

    // Leads today
    const leadsToday = leads?.filter(l => isAfter(new Date(l.created_at), today)).length || 0;

    // Hot leads (ai_temperature === 'hot' or lead_score >= 70)
    const hotLeads = leads?.filter(l => 
      (l as any).ai_temperature === "hot" || (l as any).lead_score >= 70
    ).length || 0;

    // Conversations without response (unread > 0 or last message > 24h without reply)
    const conversationsWithoutResponse = conversations?.filter(c => {
      if (c.unread_count > 0) return true;
      if (c.last_message_at) {
        const lastMsg = new Date(c.last_message_at);
        return differenceInHours(now, lastMsg) > 24;
      }
      return false;
    }).length || 0;

    // Active opportunities
    const activeOpportunities = opportunities?.filter(o => o.status === "open").length || 0;

    // Forecasted revenue (weighted by probability)
    const forecastedRevenue = opportunities?.filter(o => o.status === "open").reduce((sum, o) => {
      const probability = (o as any).conversion_probability || 50;
      return sum + ((o.value || 0) * (probability / 100));
    }, 0) || 0;

    // Calculate average response time from conversations
    let totalResponseTime = 0;
    let responseCount = 0;
    conversations?.forEach(c => {
      if (c.last_message_at && c.created_at) {
        const hours = differenceInHours(new Date(c.last_message_at), new Date(c.created_at));
        if (hours > 0 && hours < 168) { // Only count if less than 7 days
          totalResponseTime += hours;
          responseCount++;
        }
      }
    });
    const avgResponseTimeHours = responseCount > 0 ? Math.round(totalResponseTime / responseCount) : 0;

    // Leads without follow-up (created > 24h ago, status still "new")
    const leadsWithoutFollowup = leads?.filter(l => {
      const created = new Date(l.created_at);
      return isBefore(created, dayAgo) && l.status === "new";
    }).length || 0;

    // Active automations
    const activeAutomations = automations?.filter(a => a.is_active).length || 0;

    return {
      leadsToday,
      hotLeads,
      conversationsWithoutResponse,
      activeOpportunities,
      forecastedRevenue,
      avgResponseTimeHours,
      leadsWithoutFollowup,
      activeAutomations,
    };
  }, [leads, opportunities, conversations, automations, isLoading]);

  // Pipeline summary
  const pipelineSummary = useMemo<PipelineSummary | null>(() => {
    if (!stages || !opportunities) return null;

    const stageData = stages.map(stage => {
      const stageOpps = opportunities.filter(o => o.stage_id === stage.id && o.status === "open");
      return {
        id: stage.id,
        name: stage.name,
        color: stage.color,
        count: stageOpps.length,
        value: stageOpps.reduce((sum, o) => sum + (o.value || 0), 0),
      };
    });

    const mostCongested = stageData.reduce((max, s) => s.count > (max?.count || 0) ? s : max, stageData[0]);

    return {
      totalValue: stageData.reduce((sum, s) => sum + s.value, 0),
      opportunityCount: stageData.reduce((sum, s) => sum + s.count, 0),
      mostCongestedStage: mostCongested?.count > 0 ? { name: mostCongested.name, count: mostCongested.count } : null,
      stages: stageData,
    };
  }, [stages, opportunities]);

  // Efficiency metrics
  const efficiencyMetrics = useMemo<EfficiencyMetrics | null>(() => {
    if (!kpis) return null;
    
    return {
      avgResponseTimeHours: kpis.avgResponseTimeHours,
      leadsWithoutFollowup: kpis.leadsWithoutFollowup,
      activeAutomations: kpis.activeAutomations,
      estimatedTimeSavedHours: kpis.activeAutomations * 2, // Estimate 2h saved per automation
    };
  }, [kpis]);

  // Get user name from profile or auth
  const userName = useMemo(() => {
    return user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Utilizador";
  }, [user]);

  // Recent leads for AI context
  const recentLeadNames = useMemo(() => {
    return leads?.slice(0, 3).map(l => l.name) || [];
  }, [leads]);

  // Top opportunity
  const topOpportunity = useMemo(() => {
    const open = opportunities?.filter(o => o.status === "open") || [];
    const sorted = open.sort((a, b) => (b.value || 0) - (a.value || 0));
    return sorted[0] || null;
  }, [opportunities]);

  return {
    kpis,
    pipelineSummary,
    efficiencyMetrics,
    userName,
    workspaceName: currentWorkspace?.name,
    recentLeadNames,
    topOpportunity,
    isLoading,
  };
}

// AI-powered insights hook
export function useDashboardAIInsights(dashboardData: OperationalKPIs | null, userName: string, workspaceName?: string) {
  return useQuery({
    queryKey: ["dashboard-ai-insights", dashboardData, userName],
    queryFn: async (): Promise<DashboardAIResponse> => {
      if (!dashboardData) {
        return {
          greeting: `Olá!`,
          dayStatus: "A carregar dados...",
          insights: [],
          nextActions: [],
          efficiencyMetrics: { timeSavedHours: 0 },
        };
      }

      try {
        const { data, error } = await supabase.functions.invoke("ai-dashboard-insights", {
          body: { dashboardData, userName, workspaceName }
        });

        if (error) {
          // Check for rate limit or payment errors in the error message
          const errorMessage = String(error.message || error || "");
          const errorContext = JSON.stringify(error);
          
          if (errorMessage.includes("429") || errorMessage.toLowerCase().includes("rate limit") || errorContext.includes("429")) {
            console.warn("AI rate limit hit, using fallback insights");
            return generateFallbackInsights(dashboardData, userName);
          }
          if (errorMessage.includes("402") || errorMessage.toLowerCase().includes("payment") || errorContext.includes("402")) {
            console.warn("AI credits exhausted, using fallback insights");
            return generateFallbackInsights(dashboardData, userName);
          }
          console.error("AI insights error:", error);
          return generateFallbackInsights(dashboardData, userName);
        }
        
        // Check if data contains an error (edge function may return 200 with error in body for edge cases)
        if (data?.error) {
          const errorStr = String(data.error);
          if (errorStr.includes("Rate limit") || errorStr.includes("429")) {
            console.warn("AI rate limit hit (in body), using fallback insights");
            return generateFallbackInsights(dashboardData, userName);
          }
          if (errorStr.includes("Payment") || errorStr.includes("402")) {
            console.warn("AI credits exhausted (in body), using fallback insights");
            return generateFallbackInsights(dashboardData, userName);
          }
          console.warn("AI insights returned error:", data.error);
          return generateFallbackInsights(dashboardData, userName);
        }
        
        return data as DashboardAIResponse;
      } catch (error: any) {
        console.error("AI insights exception:", error);
        // Always return fallback - never let AI errors break the dashboard
        return generateFallbackInsights(dashboardData, userName);
      }
    },
    enabled: !!dashboardData,
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes to reduce AI calls
    gcTime: 15 * 60 * 1000, // Keep in cache for 15 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false, // Don't retry on error - we handle fallback ourselves
  });
}

function generateFallbackInsights(data: OperationalKPIs, userName: string): DashboardAIResponse {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? `Bom dia, ${userName}!` : hour < 19 ? `Boa tarde, ${userName}!` : `Boa noite, ${userName}!`;

  const insights: AIInsight[] = [];
  const nextActions: NextAction[] = [];

  if (data.hotLeads > 0) {
    insights.push({
      id: "hot-leads",
      type: "urgent",
      priority: "high",
      title: `${data.hotLeads} lead${data.hotLeads > 1 ? "s" : ""} quente${data.hotLeads > 1 ? "s" : ""}`,
      description: "Prontos para converter. Prioriza o contacto hoje.",
      actionLabel: "Ver leads quentes",
      actionRoute: "/dashboard/leads?filter=hot",
    });
    nextActions.push({
      id: "action-hot-leads",
      type: "lead",
      priority: "high",
      title: "Contactar leads quentes",
      reason: "Alta intenção de compra",
      actionRoute: "/dashboard/leads?filter=hot",
    });
  }

  if (data.conversationsWithoutResponse > 0) {
    insights.push({
      id: "unanswered",
      type: "urgent",
      priority: data.conversationsWithoutResponse > 3 ? "high" : "medium",
      title: `${data.conversationsWithoutResponse} conversa${data.conversationsWithoutResponse > 1 ? "s" : ""} sem resposta`,
      description: "Clientes aguardam resposta. Respostas rápidas melhoram conversão.",
      actionLabel: "Abrir inbox",
      actionRoute: "/dashboard/inbox",
    });
    nextActions.push({
      id: "action-inbox",
      type: "inbox",
      priority: "high",
      title: "Responder mensagens pendentes",
      reason: "Clientes aguardam há +24h",
      actionRoute: "/dashboard/inbox",
    });
  }

  if (data.leadsWithoutFollowup > 0) {
    insights.push({
      id: "no-followup",
      type: "warning",
      priority: "medium",
      title: `${data.leadsWithoutFollowup} lead${data.leadsWithoutFollowup > 1 ? "s" : ""} sem follow-up`,
      description: "Leads novos sem contacto há mais de 24h.",
      actionLabel: "Ver leads",
      actionRoute: "/dashboard/leads?filter=no_response",
    });
  }

  const statusParts = [];
  if (data.hotLeads > 0) statusParts.push(`${data.hotLeads} lead${data.hotLeads > 1 ? "s" : ""} quente${data.hotLeads > 1 ? "s" : ""}`);
  if (data.conversationsWithoutResponse > 0) statusParts.push(`${data.conversationsWithoutResponse} conversa${data.conversationsWithoutResponse > 1 ? "s" : ""} pendente${data.conversationsWithoutResponse > 1 ? "s" : ""}`);
  
  const dayStatus = statusParts.length > 0 
    ? `Tens ${statusParts.join(" e ")}.`
    : "Tudo em ordem! Sem ações urgentes.";

  return {
    greeting,
    dayStatus,
    insights: insights.slice(0, 3),
    nextActions: nextActions.slice(0, 5),
    efficiencyMetrics: {
      timeSavedHours: data.activeAutomations * 2,
    },
  };
}
