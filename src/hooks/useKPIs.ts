import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";
import { useLeads } from "./useLeads";
import { useOpportunitiesEnhanced, usePipelineStagesEnhanced } from "./useOpportunitiesEnhanced";
import { useConversations } from "./useConversations";
import { useAutomationRules } from "./useAutomations";
import { useProposals } from "./useProposals";
import { useTasks } from "./useTasks";
import { startOfDay, startOfWeek, startOfMonth, subDays, differenceInDays, differenceInHours, isAfter, isBefore } from "date-fns";
import {
  CoreKPIs,
  CoreLeadKPIs,
  CoreOpportunityKPIs,
  CoreEfficiencyKPIs,
  IndustryType,
  IndustrySpecificKPIs,
  Forecast,
  ForecastPeriod,
  PipelineAnalysis,
  PipelineBottleneck,
  TrendDirection,
  KPIComparison,
  KPIPeriodComparison,
} from "@/types/kpis";
import { supabase } from "@/integrations/supabase/client";

// Get trend direction based on change
function getTrend(current: number, previous: number): TrendDirection {
  if (previous === 0) return current > 0 ? "up" : "stable";
  const change = ((current - previous) / previous) * 100;
  if (change > 5) return "up";
  if (change < -5) return "down";
  return "stable";
}

// Calculate comparison between periods
function calculateComparison(current: number, previous: number): KPIComparison {
  const change = current - previous;
  const changePercent = previous > 0 ? ((current - previous) / previous) * 100 : current > 0 ? 100 : 0;
  return {
    current,
    previous,
    change,
    changePercent,
    trend: getTrend(current, previous),
  };
}

export function useKPIs() {
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();
  
  const { data: leads, isLoading: leadsLoading } = useLeads();
  const { data: opportunities, isLoading: opportunitiesLoading } = useOpportunitiesEnhanced();
  const { data: stages, isLoading: stagesLoading } = usePipelineStagesEnhanced();
  const { data: conversations, isLoading: conversationsLoading } = useConversations();
  const { data: automations, isLoading: automationsLoading } = useAutomationRules();
  const { data: proposals, isLoading: proposalsLoading } = useProposals();
  const { data: tasks, isLoading: tasksLoading } = useTasks();

  const isLoading = leadsLoading || opportunitiesLoading || stagesLoading || 
    conversationsLoading || automationsLoading || proposalsLoading || tasksLoading;

  // Detect industry type from workspace settings or pipeline types
  const industryType = useMemo<IndustryType>(() => {
    // Check pipeline types
    const pipelineTypes = stages?.map(s => (s as any).pipeline?.type).filter(Boolean) || [];
    if (pipelineTypes.includes("enrollment") || pipelineTypes.includes("education")) return "education";
    if (pipelineTypes.includes("appointment") || pipelineTypes.includes("health")) return "health";
    if (pipelineTypes.includes("project") || pipelineTypes.includes("services")) return "services";
    if (pipelineTypes.includes("real_estate")) return "real_estate";
    return "general";
  }, [stages]);

  // Core Lead KPIs
  const leadKPIs = useMemo<CoreLeadKPIs>(() => {
    if (!leads) {
      return {
        leadsToday: 0,
        leadsThisWeek: 0,
        leadsThisMonth: 0,
        leadToOpportunityRate: 0,
        avgResponseTimeHours: 0,
        leadsTrend: "stable",
      };
    }

    const now = new Date();
    const today = startOfDay(now);
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const monthStart = startOfMonth(now);
    const lastWeekStart = subDays(weekStart, 7);

    const leadsToday = leads.filter(l => isAfter(new Date(l.created_at), today)).length;
    const leadsThisWeek = leads.filter(l => isAfter(new Date(l.created_at), weekStart)).length;
    const leadsThisMonth = leads.filter(l => isAfter(new Date(l.created_at), monthStart)).length;
    const leadsLastWeek = leads.filter(l => 
      isAfter(new Date(l.created_at), lastWeekStart) && isBefore(new Date(l.created_at), weekStart)
    ).length;

    // Lead to opportunity rate
    const leadsWithOpportunity = opportunities?.filter(o => o.lead_id).length || 0;
    const leadToOpportunityRate = leads.length > 0 ? (leadsWithOpportunity / leads.length) * 100 : 0;

    // Average response time from conversations
    let totalResponseTime = 0;
    let responseCount = 0;
    conversations?.forEach(c => {
      if (c.last_message_at && c.created_at) {
        const hours = differenceInHours(new Date(c.last_message_at), new Date(c.created_at));
        if (hours > 0 && hours < 168) {
          totalResponseTime += hours;
          responseCount++;
        }
      }
    });
    const avgResponseTimeHours = responseCount > 0 ? Math.round(totalResponseTime / responseCount) : 0;

    return {
      leadsToday,
      leadsThisWeek,
      leadsThisMonth,
      leadToOpportunityRate: Math.round(leadToOpportunityRate * 10) / 10,
      avgResponseTimeHours,
      leadsTrend: getTrend(leadsThisWeek, leadsLastWeek),
    };
  }, [leads, opportunities, conversations]);

  // Core Opportunity KPIs
  const opportunityKPIs = useMemo<CoreOpportunityKPIs>(() => {
    if (!opportunities) {
      return {
        activeOpportunities: 0,
        totalPipelineValue: 0,
        weightedValue: 0,
        closeRate: 0,
        avgCloseTimeDays: 0,
        opportunitiesTrend: "stable",
      };
    }

    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const lastWeekStart = subDays(weekStart, 7);

    const openOpps = opportunities.filter(o => o.status === "open");
    const wonOpps = opportunities.filter(o => o.status === "won");
    const lostOpps = opportunities.filter(o => o.status === "lost");
    const closedOpps = [...wonOpps, ...lostOpps];

    const activeOpportunities = openOpps.length;
    const totalPipelineValue = openOpps.reduce((sum, o) => sum + Number(o.value || 0), 0);
    const weightedValue = openOpps.reduce(
      (sum, o) => sum + (Number(o.value || 0) * (o.probability || 50) / 100),
      0
    );
    const closeRate = closedOpps.length > 0 ? (wonOpps.length / closedOpps.length) * 100 : 0;

    // Calculate avg close time for won opportunities
    let avgCloseTimeDays = 0;
    if (wonOpps.length > 0) {
      const totalDays = wonOpps.reduce((sum, o) => {
        const created = new Date(o.created_at);
        const updated = new Date(o.updated_at);
        return sum + differenceInDays(updated, created);
      }, 0);
      avgCloseTimeDays = Math.round(totalDays / wonOpps.length);
    }

    // Trend based on this week vs last week
    const oppsThisWeek = opportunities.filter(o => isAfter(new Date(o.created_at), weekStart)).length;
    const oppsLastWeek = opportunities.filter(o => 
      isAfter(new Date(o.created_at), lastWeekStart) && isBefore(new Date(o.created_at), weekStart)
    ).length;

    return {
      activeOpportunities,
      totalPipelineValue,
      weightedValue: Math.round(weightedValue),
      closeRate: Math.round(closeRate * 10) / 10,
      avgCloseTimeDays,
      opportunitiesTrend: getTrend(oppsThisWeek, oppsLastWeek),
    };
  }, [opportunities]);

  // Core Efficiency KPIs
  const efficiencyKPIs = useMemo<CoreEfficiencyKPIs>(() => {
    const now = new Date();
    const staleDaysThreshold = 7;

    // Stale opportunities (no activity > X days)
    const staleOpportunities = opportunities?.filter(o => {
      if (o.status !== "open") return false;
      const lastActivity = o.last_activity_at ? new Date(o.last_activity_at) : new Date(o.updated_at);
      return differenceInDays(now, lastActivity) > staleDaysThreshold;
    }).length || 0;

    // Overdue followups from tasks
    const overdueFollowups = tasks?.filter(t => {
      if (t.status === "done") return false;
      if (!t.due_at) return false;
      return isBefore(new Date(t.due_at), now);
    }).length || 0;

    // Active automations
    const activeAutomations = automations?.filter(a => a.is_active).length || 0;
    const totalAutomations = automations?.length || 0;
    const manualVsAutomatedRatio = totalAutomations > 0 ? (activeAutomations / totalAutomations) * 100 : 0;

    // Estimated time saved (2h per active automation)
    const timeSavedHours = activeAutomations * 2;

    return {
      staleOpportunities,
      overdueFollowups,
      activeAutomations,
      manualVsAutomatedRatio: Math.round(manualVsAutomatedRatio),
      timeSavedHours,
    };
  }, [opportunities, tasks, automations]);

  // Pipeline Analysis
  const pipelineAnalysis = useMemo<PipelineAnalysis>(() => {
    if (!stages || !opportunities) {
      return {
        stages: [],
        totalInPipeline: 0,
        totalValue: 0,
        mostCongestedStage: null,
        healthScore: 0,
      };
    }

    const now = new Date();
    const openOpps = opportunities.filter(o => o.status === "open");

    const stageAnalysis: PipelineBottleneck[] = stages.map(stage => {
      const stageOpps = openOpps.filter(o => o.stage_id === stage.id);
      const avgDaysInStage = stageOpps.length > 0
        ? stageOpps.reduce((sum, o) => {
            const enteredStage = o.last_activity_at ? new Date(o.last_activity_at) : new Date(o.created_at);
            return sum + differenceInDays(now, enteredStage);
          }, 0) / stageOpps.length
        : 0;

      const isBottleneck = stageOpps.length > 3 && avgDaysInStage > 7;

      return {
        stageId: stage.id,
        stageName: stage.name,
        stageColor: stage.color,
        count: stageOpps.length,
        avgDaysInStage: Math.round(avgDaysInStage),
        isBottleneck,
        suggestion: isBottleneck 
          ? `${stageOpps.length} oportunidades paradas há mais de ${Math.round(avgDaysInStage)} dias`
          : undefined,
      };
    });

    const mostCongested = stageAnalysis.reduce((max, s) => 
      s.count > (max?.count || 0) ? s : max, stageAnalysis[0]
    );

    // Health score: 100 - (bottleneck penalty) - (stale penalty)
    const bottleneckCount = stageAnalysis.filter(s => s.isBottleneck).length;
    const stalePercent = openOpps.length > 0 
      ? (efficiencyKPIs.staleOpportunities / openOpps.length) * 100 
      : 0;
    const healthScore = Math.max(0, Math.min(100, 100 - (bottleneckCount * 15) - (stalePercent * 0.5)));

    return {
      stages: stageAnalysis,
      totalInPipeline: openOpps.length,
      totalValue: openOpps.reduce((sum, o) => sum + Number(o.value || 0), 0),
      mostCongestedStage: mostCongested?.count > 0 ? mostCongested.stageName : null,
      healthScore: Math.round(healthScore),
    };
  }, [stages, opportunities, efficiencyKPIs]);

  // Forecast calculation
  const forecast = useMemo<Forecast>(() => {
    const now = new Date();
    const openOpps = opportunities?.filter(o => o.status === "open") || [];
    const wonOpps = opportunities?.filter(o => o.status === "won") || [];
    
    // Historical close rate for confidence
    const historicalCloseRate = opportunityKPIs.closeRate / 100;
    const hasEnoughHistory = wonOpps.length >= 3;

    const periods: ForecastPeriod[] = [
      { period: "30d", label: "30 dias", expectedRevenue: 0, expectedDeals: 0, confidence: 0 },
      { period: "60d", label: "60 dias", expectedRevenue: 0, expectedDeals: 0, confidence: 0 },
      { period: "90d", label: "90 dias", expectedRevenue: 0, expectedDeals: 0, confidence: 0 },
    ];

    periods.forEach(p => {
      const daysAhead = parseInt(p.period);
      const targetDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

      // Filter opportunities likely to close in this period
      const relevantOpps = openOpps.filter(o => {
        if (o.expected_close_date) {
          return new Date(o.expected_close_date) <= targetDate;
        }
        // If no expected close date, estimate based on avg close time
        const daysOpen = differenceInDays(now, new Date(o.created_at));
        const expectedCloseInDays = Math.max(0, opportunityKPIs.avgCloseTimeDays - daysOpen);
        return expectedCloseInDays <= daysAhead;
      });

      // Calculate weighted revenue
      p.expectedRevenue = Math.round(relevantOpps.reduce(
        (sum, o) => sum + (Number(o.value || 0) * (o.probability || 50) / 100),
        0
      ));

      // Expected deals based on probability
      p.expectedDeals = Math.round(relevantOpps.reduce(
        (sum, o) => sum + ((o.probability || 50) / 100),
        0
      ));

      // Confidence based on data availability
      const baseConfidence = hasEnoughHistory ? 70 : 40;
      const dateAccuracyBonus = relevantOpps.filter(o => o.expected_close_date).length / 
        Math.max(1, relevantOpps.length) * 20;
      p.confidence = Math.min(95, Math.round(baseConfidence + dateAccuracyBonus));
    });

    return {
      periods,
      basedOnHistory: hasEnoughHistory,
      lastUpdated: now.toISOString(),
      explanation: hasEnoughHistory
        ? "Previsão baseada no teu histórico de fechos recentes."
        : "Previsão estimada. À medida que fechares mais negócios, a precisão melhora.",
    };
  }, [opportunities, opportunityKPIs]);

  // Industry-specific KPIs
  const industryKPIs = useMemo<IndustrySpecificKPIs | undefined>(() => {
    if (industryType === "general") return undefined;

    const wonOpps = opportunities?.filter(o => o.status === "won") || [];
    const openOpps = opportunities?.filter(o => o.status === "open") || [];

    if (industryType === "education") {
      const enrollments = wonOpps.length;
      const visits = proposals?.length || 0;
      return {
        enrollmentsConfirmed: enrollments,
        visitToEnrollmentRate: visits > 0 ? Math.round((enrollments / visits) * 100) : 0,
        valuePerStudent: enrollments > 0 
          ? Math.round(wonOpps.reduce((sum, o) => sum + Number(o.value || 0), 0) / enrollments)
          : 0,
        avgTimeToEnrollmentDays: opportunityKPIs.avgCloseTimeDays,
        pendingDocuments: openOpps.filter(o => o.probability && o.probability >= 60).length,
      };
    }

    if (industryType === "health") {
      const appointments = wonOpps.length;
      const requests = leads?.length || 0;
      return {
        appointmentsScheduled: appointments,
        requestToAppointmentRate: requests > 0 ? Math.round((appointments / requests) * 100) : 0,
        noShowRate: 0, // Would need appointment tracking
        avgTimeToFirstAppointmentDays: opportunityKPIs.avgCloseTimeDays,
        treatmentsInProgress: openOpps.length,
      };
    }

    if (industryType === "services") {
      const proposalsSent = proposals?.length || 0;
      return {
        proposalsSent,
        proposalWinRate: opportunityKPIs.closeRate,
        avgTicket: wonOpps.length > 0
          ? Math.round(wonOpps.reduce((sum, o) => sum + Number(o.value || 0), 0) / wonOpps.length)
          : 0,
        activeRecurringRevenue: openOpps.reduce((sum, o) => sum + Number(o.value || 0), 0),
        projectsInProgress: openOpps.length,
      };
    }

    return undefined;
  }, [industryType, opportunities, proposals, leads, opportunityKPIs]);

  // Period comparison
  const periodComparison = useMemo<KPIPeriodComparison | null>(() => {
    if (!leads || !opportunities) return null;

    const now = new Date();
    const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });
    const lastWeekStart = subDays(thisWeekStart, 7);
    const twoWeeksAgo = subDays(thisWeekStart, 14);

    // This week data
    const leadsThisWeek = leads.filter(l => isAfter(new Date(l.created_at), thisWeekStart)).length;
    const oppsThisWeek = opportunities.filter(o => isAfter(new Date(o.created_at), thisWeekStart));
    const revenueThisWeek = oppsThisWeek
      .filter(o => o.status === "won")
      .reduce((sum, o) => sum + Number(o.value || 0), 0);

    // Last week data
    const leadsLastWeek = leads.filter(l => 
      isAfter(new Date(l.created_at), lastWeekStart) && isBefore(new Date(l.created_at), thisWeekStart)
    ).length;
    const oppsLastWeek = opportunities.filter(o => 
      isAfter(new Date(o.created_at), lastWeekStart) && isBefore(new Date(o.created_at), thisWeekStart)
    );
    const revenueLastWeek = oppsLastWeek
      .filter(o => o.status === "won")
      .reduce((sum, o) => sum + Number(o.value || 0), 0);

    return {
      period: "Esta semana vs anterior",
      leads: calculateComparison(leadsThisWeek, leadsLastWeek),
      opportunities: calculateComparison(oppsThisWeek.length, oppsLastWeek.length),
      revenue: calculateComparison(revenueThisWeek, revenueLastWeek),
      closeRate: calculateComparison(opportunityKPIs.closeRate, opportunityKPIs.closeRate),
    };
  }, [leads, opportunities, opportunityKPIs]);

  const coreKPIs: CoreKPIs = {
    leads: leadKPIs,
    opportunities: opportunityKPIs,
    efficiency: efficiencyKPIs,
  };

  return {
    coreKPIs,
    industryKPIs,
    industryType,
    forecast,
    pipelineAnalysis,
    periodComparison,
    isLoading,
    rawData: {
      leads,
      opportunities,
      stages,
      conversations,
      automations,
      proposals,
      tasks,
    },
  };
}

// AI KPI Analysis hook
export function useKPIAIAnalysis(kpiData: CoreKPIs | null, industryType: IndustryType) {
  return useQuery({
    queryKey: ["kpi-ai-analysis", kpiData, industryType],
    queryFn: async () => {
      if (!kpiData) return null;

      try {
        const { data, error } = await supabase.functions.invoke("ai-kpi-analysis", {
          body: { kpiData, industryType }
        });

        if (error) throw error;
        return data;
      } catch (error) {
        console.error("AI KPI analysis error:", error);
        return null;
      }
    },
    enabled: !!kpiData,
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
    refetchOnWindowFocus: false,
  });
}
