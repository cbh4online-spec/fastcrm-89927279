import { useMemo } from "react";
import { useLeads } from "./useLeads";
import { useContacts } from "./useContacts";
import { useCompanies } from "./useCompanies";
import { useOpportunities } from "./useOpportunities";
import { useProposals } from "./useProposals";
import { usePipelineStages } from "./usePipelineStages";
import { useTasks } from "./useTasks";
import { useConversations } from "./useConversations";
import { startOfDay, subDays, isAfter, isBefore, differenceInDays } from "date-fns";
import type { KPIData } from "@/components/dashboard/DashboardKPICards";
import type { Task as DashboardTask } from "@/components/dashboard/DashboardNextActions";
import type { PipelineStage } from "@/components/dashboard/DashboardPipelineSnapshot";

export function useDashboardData() {
  const { data: leads, isLoading: leadsLoading } = useLeads();
  const { contacts, isLoading: contactsLoading } = useContacts();
  const { companies, isLoading: companiesLoading } = useCompanies();
  const { data: opportunities, isLoading: opportunitiesLoading } = useOpportunities();
  const { data: proposals, isLoading: proposalsLoading } = useProposals();
  const { data: stages, isLoading: stagesLoading } = usePipelineStages();
  const { data: tasks, isLoading: tasksLoading } = useTasks();
  const { data: conversations, isLoading: conversationsLoading } = useConversations();

  const isLoading = leadsLoading || contactsLoading || companiesLoading || 
    opportunitiesLoading || proposalsLoading || stagesLoading || tasksLoading || conversationsLoading;

  // Calculate KPI data
  const kpiData = useMemo<KPIData | null>(() => {
    if (isLoading) return null;

    const today = startOfDay(new Date());
    const weekAgo = subDays(today, 7);
    const monthAgo = subDays(today, 30);
    const twoMonthsAgo = subDays(today, 60);

    // Leads
    const leadsToday = leads?.filter(l => 
      isAfter(new Date(l.created_at), today)
    ).length || 0;
    
    const leadsWeek = leads?.filter(l => 
      isAfter(new Date(l.created_at), weekAgo)
    ).length || 0;

    const leadsLastMonth = leads?.filter(l => {
      const date = new Date(l.created_at);
      return isAfter(date, twoMonthsAgo) && isBefore(date, monthAgo);
    }).length || 0;

    const leadsThisMonth = leads?.filter(l => 
      isAfter(new Date(l.created_at), monthAgo)
    ).length || 0;

    const leadsTrend = leadsLastMonth > 0 
      ? Math.round(((leadsThisMonth - leadsLastMonth) / leadsLastMonth) * 100)
      : 0;

    // Opportunities
    const activeOpportunities = opportunities?.filter(o => 
      o.status === "open"
    ) || [];
    
    const opportunitiesValue = activeOpportunities.reduce((sum, o) => 
      sum + (o.value || 0), 0
    );

    const opportunitiesTrend = 0; // Would need historical data

    // Proposals
    const proposalsSent = proposals?.filter(p => 
      p.status === "published" && isAfter(new Date(p.created_at), monthAgo)
    ).length || 0;

    const proposalsPending = proposals?.filter(p => 
      p.status === "published" || p.status === "draft"
    ).length || 0;

    const proposalsTrend = 0; // Would need historical data

    // Revenue forecast (weighted by probability - simple calculation)
    const revenueForecast = activeOpportunities.reduce((sum, o) => {
      // Assume 50% probability for all opportunities as a simple model
      return sum + ((o.value || 0) * 0.5);
    }, 0);

    return {
      leadsToday,
      leadsWeek,
      leadsTrend,
      activeOpportunities: activeOpportunities.length,
      opportunitiesValue,
      opportunitiesTrend,
      proposalsSent,
      proposalsTrend,
      proposalsPending,
      revenueForecast,
      revenueTrend: 0,
    };
  }, [leads, opportunities, proposals, isLoading]);

  // Calculate AI insights data
  const insightsData = useMemo(() => {
    if (isLoading) return null;

    const today = new Date();
    const dayAgo = subDays(today, 1);

    // Leads without response (created > 24h ago, status still "new")
    const leadsWithoutResponse = leads?.filter(l => {
      const created = new Date(l.created_at);
      return isBefore(created, dayAgo) && l.status === "new";
    }).length || 0;

    // Proposals viewed but not followed up
    const proposalsViewed = proposals?.filter(p => 
      p.views_count && p.views_count > 0 && p.status === "published"
    ).length || 0;

    // High probability opportunities (in later stages)
    const laterStageIds = stages?.slice(-2).map(s => s.id) || [];
    const highProbabilityOpportunities = opportunities?.filter(o => 
      laterStageIds.includes(o.stage_id) && o.status === "open"
    ).length || 0;

    // Overdue follow-ups
    const overdueFollowUps = tasks?.filter(t => 
      t.status === "pending" && t.due_at && isBefore(new Date(t.due_at), today)
    ).length || 0;

    // Unanswered messages
    const unansweredMessages = conversations?.filter(c => 
      c.unread_count > 0
    ).reduce((sum, c) => sum + c.unread_count, 0) || 0;

    return {
      leadsWithoutResponse,
      proposalsViewed,
      highProbabilityOpportunities,
      overdueFollowUps,
      unansweredMessages,
    };
  }, [leads, proposals, opportunities, stages, tasks, conversations, isLoading]);

  // Calculate next actions (tasks)
  const nextActions = useMemo<DashboardTask[]>(() => {
    if (!tasks) return [];

    const today = new Date();

    return tasks
      .filter(t => t.status === "pending")
      .map(t => ({
        id: t.id,
        title: t.title,
        type: "follow_up" as DashboardTask["type"],
        dueDate: new Date(t.due_at || t.created_at),
        entityType: t.related_type as DashboardTask["entityType"],
        completed: t.status === "done",
      }))
      .sort((a, b) => {
        // Sort by: overdue first, then by due date
        const aOverdue = isBefore(a.dueDate, today);
        const bOverdue = isBefore(b.dueDate, today);
        if (aOverdue && !bOverdue) return -1;
        if (!aOverdue && bOverdue) return 1;
        return a.dueDate.getTime() - b.dueDate.getTime();
      });
  }, [tasks]);

  const overdueTaskCount = useMemo(() => {
    const today = new Date();
    return nextActions.filter(t => isBefore(t.dueDate, today)).length;
  }, [nextActions]);

  // Calculate pipeline snapshot
  const pipelineData = useMemo<{ stages: PipelineStage[]; totalValue: number }>(() => {
    if (!stages || !opportunities) {
      return { stages: [], totalValue: 0 };
    }

    const today = new Date();

    const pipelineStages: PipelineStage[] = stages.map(stage => {
      const stageOpportunities = opportunities.filter(o => 
        o.stage_id === stage.id && o.status === "open"
      );
      
      const value = stageOpportunities.reduce((sum, o) => sum + (o.value || 0), 0);
      
      // Check for stalled opportunities (no update in 7+ days)
      const stalledOpps = stageOpportunities.filter(o => {
        const updated = new Date(o.updated_at);
        return differenceInDays(today, updated) >= 7;
      });

      return {
        id: stage.id,
        name: stage.name,
        color: stage.color,
        count: stageOpportunities.length,
        value,
        isStalled: stalledOpps.length > 0,
        stalledCount: stalledOpps.length,
      };
    });

    const totalValue = pipelineStages.reduce((sum, s) => sum + s.value, 0);

    return { stages: pipelineStages, totalValue };
  }, [stages, opportunities]);

  return {
    kpiData,
    insightsData,
    nextActions,
    overdueTaskCount,
    pipelineStages: pipelineData.stages,
    pipelineTotalValue: pipelineData.totalValue,
    isLoading,
  };
}
