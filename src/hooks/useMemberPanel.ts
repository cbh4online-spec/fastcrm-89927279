import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, differenceInDays } from 'date-fns';
import { useAIPriorities, AIPriority, AIInsights } from './useAIPriorities';
import { useDashboardRole, DashboardRole } from './useDashboardRole';

export interface MeetingToday {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  location: string | null;
  meeting_url: string | null;
  status: string;
  contact_id: string | null;
  company_id: string | null;
  lead_id: string | null;
  contact_name?: string;
  company_name?: string;
  calendar?: {
    name: string;
    calendar_type: string;
  };
}

export interface OpportunityAtRisk {
  id: string;
  title: string;
  value: number;
  stage: string;
  days_inactive: number;
  probability: number;
  contact_name?: string;
  company_name?: string;
  last_activity?: string;
  risk_level: 'high' | 'medium' | 'low';
  action_needed: string;
}

export interface PerformanceMetrics {
  daily: {
    target: number;
    current: number;
    percentage: number;
  };
  weekly: {
    target: number;
    current: number;
    percentage: number;
  };
  monthly: {
    target: number;
    current: number;
    percentage: number;
  };
  yearly: {
    target: number;
    current: number;
    percentage: number;
  };
  comparison: {
    vsLastWeek: number;
    vsLastMonth: number;
  };
  dealsToClose: number;
  meetingsNeeded: number;
}

export interface AlertItem {
  id: string;
  type: 'warning' | 'info' | 'success' | 'ai_insight';
  title: string;
  message: string;
  timestamp: string;
  entityId?: string;
  entityType?: string;
  actionUrl?: string;
}

// Re-export types from useAIPriorities
export type { AIPriority, AIInsights };
export type PriorityAction = AIPriority;

export function useMemberPanel() {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const { defaultRole, availableRoles, canSwitchRole } = useDashboardRole();
  const { 
    insights, 
    isLoading: aiLoading, 
    fetchAIPriorities, 
    updatePriorityStatus: updateAIPriorityStatus, 
    error: aiError 
  } = useAIPriorities();
  
  const [isLoading, setIsLoading] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [currentRole, setCurrentRole] = useState<DashboardRole>(defaultRole);
  const [meetings, setMeetings] = useState<MeetingToday[]>([]);
  const [opportunities, setOpportunities] = useState<OpportunityAtRisk[]>([]);
  const [performance, setPerformance] = useState<PerformanceMetrics | null>(null);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [stats, setStats] = useState({
    pendingFollowups: 0,
    overdueFollowups: 0,
    unreadConversations: 0,
  });

  const today = new Date();

  // Update role when default changes
  useEffect(() => {
    setCurrentRole(defaultRole);
  }, [defaultRole]);

  const fetchMeetings = useCallback(async () => {
    if (!currentWorkspace?.id || !user?.id) return [];

    const dayStart = startOfDay(today).toISOString();
    const dayEnd = endOfDay(today).toISOString();

    const { data, error } = await supabase
      .from('calendar_events')
      .select(`
        id, title, start_time, end_time, location, meeting_url, status,
        contact_id, company_id, lead_id,
        calendar:calendars(name, calendar_type),
        contact:contacts(name),
        company:companies(name)
      `)
      .eq('workspace_id', currentWorkspace.id)
      .gte('start_time', dayStart)
      .lte('start_time', dayEnd)
      .order('start_time');

    if (!error && data) {
      const formattedMeetings = (data as any[]).map(m => ({
        ...m,
        contact_name: m.contact?.name,
        company_name: m.company?.name,
      }));
      setMeetings(formattedMeetings);
      return formattedMeetings;
    }
    return [];
  }, [currentWorkspace?.id, user?.id]);

  const fetchOpportunities = useCallback(async () => {
    if (!currentWorkspace?.id || !user?.id) return [];

    const { data, error } = await supabase
      .from('opportunities')
      .select(`
        id, title, value, stage_id, probability, updated_at, status,
        contact:contacts(name),
        company:companies(name),
        stage:pipeline_stages(name)
      `)
      .eq('workspace_id', currentWorkspace.id)
      .eq('owner_id', user.id)
      .eq('status', 'open')
      .order('value', { ascending: false })
      .limit(10);

    if (!error && data) {
      const oppsWithRisk = (data as any[]).map(opp => {
        const daysInactive = differenceInDays(today, new Date(opp.updated_at));
        let riskLevel: 'high' | 'medium' | 'low' = 'low';
        let actionNeeded = 'Manter acompanhamento';

        if (daysInactive > 14) {
          riskLevel = 'high';
          actionNeeded = 'Contactar urgentemente';
        } else if (daysInactive > 7) {
          riskLevel = 'medium';
          actionNeeded = 'Fazer follow-up esta semana';
        }

        return {
          id: opp.id,
          title: opp.title,
          value: opp.value || 0,
          stage: opp.stage?.name || 'N/A',
          days_inactive: daysInactive,
          probability: opp.probability || 50,
          contact_name: opp.contact?.name,
          company_name: opp.company?.name,
          last_activity: opp.updated_at,
          risk_level: riskLevel,
          action_needed: actionNeeded,
        };
      });

      setOpportunities(oppsWithRisk);
      return oppsWithRisk;
    }
    return [];
  }, [currentWorkspace?.id, user?.id]);

  const fetchPerformance = useCallback(async () => {
    if (!currentWorkspace?.id || !user?.id) return null;

    const monthStart = startOfMonth(today).toISOString();
    const monthEnd = endOfMonth(today).toISOString();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 }).toISOString();
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 }).toISOString();

    const { data: closedDeals } = await supabase
      .from('opportunities')
      .select('value, updated_at')
      .eq('workspace_id', currentWorkspace.id)
      .eq('owner_id', user.id)
      .eq('status', 'won')
      .gte('updated_at', monthStart)
      .lte('updated_at', monthEnd);

    const monthlyValue = (closedDeals as any[] | null)?.reduce((sum, d) => sum + (d.value || 0), 0) || 0;
    const weeklyValue = (closedDeals as any[] | null)?.filter(d => 
      d.updated_at && d.updated_at >= weekStart && d.updated_at <= weekEnd
    ).reduce((sum, d) => sum + (d.value || 0), 0) || 0;

    const monthlyTarget = 50000;
    const weeklyTarget = 12500;
    const dailyTarget = 2500;
    const yearlyTarget = 600000;

    const perf: PerformanceMetrics = {
      daily: {
        target: dailyTarget,
        current: 0,
        percentage: 0,
      },
      weekly: {
        target: weeklyTarget,
        current: weeklyValue,
        percentage: Math.round((weeklyValue / weeklyTarget) * 100),
      },
      monthly: {
        target: monthlyTarget,
        current: monthlyValue,
        percentage: Math.round((monthlyValue / monthlyTarget) * 100),
      },
      yearly: {
        target: yearlyTarget,
        current: monthlyValue * 12,
        percentage: Math.round((monthlyValue * 12 / yearlyTarget) * 100),
      },
      comparison: {
        vsLastWeek: 12,
        vsLastMonth: -5,
      },
      dealsToClose: Math.ceil((monthlyTarget - monthlyValue) / 5000),
      meetingsNeeded: Math.ceil((monthlyTarget - monthlyValue) / 2000),
    };

    setPerformance(perf);
    return perf;
  }, [currentWorkspace?.id, user?.id]);

  const fetchStats = useCallback(async () => {
    if (!currentWorkspace?.id) return;

    // Get conversation stats
    const { count: unreadCount } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', currentWorkspace.id)
      .gt('unread_count', 0);

    setStats(prev => ({
      ...prev,
      unreadConversations: unreadCount || 0,
    }));
  }, [currentWorkspace?.id]);

  const generateAlerts = useCallback((opps: OpportunityAtRisk[], perf: PerformanceMetrics | null) => {
    const generatedAlerts: AlertItem[] = [];

    // Add alerts for high-risk opportunities
    opps
      .filter(o => o.risk_level === 'high')
      .slice(0, 3)
      .forEach(opp => {
        generatedAlerts.push({
          id: `alert-opp-${opp.id}`,
          type: 'warning',
          title: 'Oportunidade em risco',
          message: `${opp.title} sem resposta há ${opp.days_inactive} dias`,
          timestamp: new Date().toISOString(),
          entityId: opp.id,
          entityType: 'opportunity',
        });
      });

    // Performance insights
    if (perf && perf.weekly.percentage < 50) {
      generatedAlerts.push({
        id: 'alert-performance',
        type: 'ai_insight',
        title: 'Insight de Performance',
        message: `Estás a ${perf.weekly.percentage}% da meta semanal. Precisas de ${perf.dealsToClose} negócios para recuperar.`,
        timestamp: new Date().toISOString(),
      });
    }

    setAlerts(generatedAlerts);
  }, []);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      if (!currentWorkspace?.id || !user?.id) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const [meetingsData, oppsData, perfData] = await Promise.all([
        fetchMeetings(),
        fetchOpportunities(),
        fetchPerformance(),
        fetchStats(),
      ]);

      generateAlerts(oppsData || [], perfData);
      setDataLoaded(true);
      setIsLoading(false);
    };

    loadData();
  }, [currentWorkspace?.id, user?.id]);

  // Fetch AI priorities after data is loaded
  useEffect(() => {
    if (!dataLoaded || !performance) return;

    const meetingsForAI = meetings.map(m => ({
      id: m.id,
      title: m.title,
      start_time: m.start_time,
      end_time: m.end_time,
      contact_name: m.contact_name,
      company_name: m.company_name,
    }));

    const oppsForAI = opportunities.map(o => ({
      id: o.id,
      title: o.title,
      value: o.value,
      stage: o.stage,
      days_inactive: o.days_inactive,
      probability: o.probability,
      contact_name: o.contact_name,
      company_name: o.company_name,
    }));

    const perfForAI = {
      weekly_target: performance.weekly.target,
      weekly_current: performance.weekly.current,
      monthly_target: performance.monthly.target,
      monthly_current: performance.monthly.current,
      deals_to_close: performance.dealsToClose,
    };

    fetchAIPriorities(currentRole, meetingsForAI, oppsForAI, perfForAI, stats);
  }, [dataLoaded, performance, currentRole]);

  // Derived values from AI insights
  const greeting = insights?.greeting || `Olá!`;
  const priorities = insights?.priorities || [];
  const coachTip = insights?.coachTip;

  const daySummary = useMemo(() => {
    const criticalTasks = priorities.filter(p => p.priority === 'high' && p.status === 'pending').length;
    const riskyOpps = opportunities.filter(o => o.risk_level === 'high').length;
    const weeklyProgress = performance?.weekly.percentage || 0;

    return {
      meetingsCount: meetings.length,
      criticalTasks,
      riskyOpps,
      weeklyProgress,
      summaryText: insights?.daySummary || 
        `Hoje tens ${meetings.length} reunião${meetings.length !== 1 ? 'ões' : ''}, ${criticalTasks} tarefa${criticalTasks !== 1 ? 's' : ''} crítica${criticalTasks !== 1 ? 's' : ''} e estás a ${weeklyProgress}% da meta semanal.`,
    };
  }, [meetings, priorities, opportunities, performance, insights]);

  const updatePriorityStatus = useCallback((id: string, status: AIPriority['status']) => {
    updateAIPriorityStatus(id, status);
  }, [updateAIPriorityStatus]);

  const switchRole = useCallback((role: DashboardRole) => {
    if (availableRoles.includes(role)) {
      setCurrentRole(role);
    }
  }, [availableRoles]);

  const refresh = useCallback(async () => {
    setDataLoaded(false);
    const [meetingsData, oppsData, perfData] = await Promise.all([
      fetchMeetings(),
      fetchOpportunities(),
      fetchPerformance(),
      fetchStats(),
    ]);
    generateAlerts(oppsData || [], perfData);
    setDataLoaded(true);
  }, [fetchMeetings, fetchOpportunities, fetchPerformance, fetchStats, generateAlerts]);

  return {
    // Loading states
    isLoading: isLoading || aiLoading,
    aiLoading,
    aiError,
    
    // Role management
    currentRole,
    availableRoles,
    canSwitchRole,
    switchRole,
    
    // AI-generated content
    greeting,
    daySummary,
    priorities,
    coachTip,
    
    // Data
    meetings,
    opportunities,
    performance,
    alerts,
    stats,
    
    // Actions
    updatePriorityStatus,
    refresh,
  };
}
