import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, format, differenceInDays, isToday } from 'date-fns';
import { pt } from 'date-fns/locale';

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
  calendar?: {
    name: string;
    calendar_type: string;
  };
}

export interface PriorityAction {
  id: string;
  type: 'follow_up' | 'meeting_prep' | 'message' | 'call' | 'close_deal' | 'task';
  title: string;
  description: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  entityId?: string;
  entityType?: 'lead' | 'contact' | 'opportunity' | 'company';
  dueDate?: string;
  status: 'pending' | 'completed' | 'deferred' | 'ignored';
}

export interface FollowUpTask {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: string;
  status: string;
  entity_type: string;
  entity_id: string;
  entity_name?: string;
  is_overdue: boolean;
  days_overdue?: number;
  created_at: string;
  source: 'manual' | 'auto' | 'ai';
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

export function useMemberPanel() {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const [isLoading, setIsLoading] = useState(true);
  const [meetings, setMeetings] = useState<MeetingToday[]>([]);
  const [priorities, setPriorities] = useState<PriorityAction[]>([]);
  const [followUps, setFollowUps] = useState<FollowUpTask[]>([]);
  const [opportunities, setOpportunities] = useState<OpportunityAtRisk[]>([]);
  const [performance, setPerformance] = useState<PerformanceMetrics | null>(null);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);

  const today = new Date();
  const userName = user?.user_metadata?.full_name?.split(' ')[0] || 'Comercial';

  // Greeting based on time of day
  const greeting = useMemo(() => {
    const hour = today.getHours();
    if (hour < 12) return `Bom dia, ${userName}!`;
    if (hour < 19) return `Boa tarde, ${userName}!`;
    return `Boa noite, ${userName}!`;
  }, [userName, today]);

  const fetchMeetings = async () => {
    if (!currentWorkspace?.id || !user?.id) return;

    const dayStart = startOfDay(today).toISOString();
    const dayEnd = endOfDay(today).toISOString();

    const { data, error } = await supabase
      .from('calendar_events')
      .select(`
        id, title, start_time, end_time, location, meeting_url, status,
        contact_id, company_id, lead_id,
        calendar:calendars(name, calendar_type)
      `)
      .eq('workspace_id', currentWorkspace.id)
      .gte('start_time', dayStart)
      .lte('start_time', dayEnd)
      .order('start_time');

    if (!error && data) {
      setMeetings(data as unknown as MeetingToday[]);
    }
  };

  const fetchOpportunities = async () => {
    if (!currentWorkspace?.id || !user?.id) return;

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
    }
  };

  const fetchPerformance = async () => {
    if (!currentWorkspace?.id || !user?.id) return;

    // Get closed opportunities for this user (status = 'won')
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

    // Demo targets - in real app, these come from user settings
    const monthlyTarget = 50000;
    const weeklyTarget = 12500;
    const dailyTarget = 2500;
    const yearlyTarget = 600000;

    setPerformance({
      daily: {
        target: dailyTarget,
        current: 0, // Would need daily tracking
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
        current: monthlyValue * 12, // Simplified projection
        percentage: Math.round((monthlyValue * 12 / yearlyTarget) * 100),
      },
      comparison: {
        vsLastWeek: 12, // Demo data
        vsLastMonth: -5,
      },
      dealsToClose: Math.ceil((monthlyTarget - monthlyValue) / 5000),
      meetingsNeeded: Math.ceil((monthlyTarget - monthlyValue) / 2000),
    });
  };

  const generatePriorities = async () => {
    if (!currentWorkspace?.id || !user?.id) return;

    // Generate priorities based on data
    const generatedPriorities: PriorityAction[] = [];

    // Add meeting preps
    meetings.forEach((meeting, index) => {
      if (index < 2) {
        generatedPriorities.push({
          id: `prep-${meeting.id}`,
          type: 'meeting_prep',
          title: `Preparar reunião: ${meeting.title}`,
          description: `Às ${format(new Date(meeting.start_time), 'HH:mm')}`,
          reason: 'Reunião em breve - preparação aumenta taxa de sucesso em 40%',
          priority: 'high',
          entityId: meeting.id,
          entityType: 'lead',
          status: 'pending',
        });
      }
    });

    // Add high-risk opportunities as follow-ups
    opportunities
      .filter(o => o.risk_level === 'high')
      .slice(0, 2)
      .forEach(opp => {
        generatedPriorities.push({
          id: `follow-${opp.id}`,
          type: 'follow_up',
          title: `Follow-up urgente: ${opp.title}`,
          description: `Sem atividade há ${opp.days_inactive} dias`,
          reason: `Negócio de ${new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(opp.value)} em risco`,
          priority: 'high',
          entityId: opp.id,
          entityType: 'opportunity',
          status: 'pending',
        });
      });

    // Add close deals if any are hot
    opportunities
      .filter(o => o.probability >= 80 && o.stage === 'Negociação')
      .slice(0, 1)
      .forEach(opp => {
        generatedPriorities.push({
          id: `close-${opp.id}`,
          type: 'close_deal',
          title: `Fechar negócio: ${opp.title}`,
          description: `${opp.probability}% de probabilidade de fecho`,
          reason: 'Alta probabilidade - foco para bater meta',
          priority: 'high',
          entityId: opp.id,
          entityType: 'opportunity',
          status: 'pending',
        });
      });

    setPriorities(generatedPriorities.slice(0, 5));
  };

  const generateAlerts = () => {
    const generatedAlerts: AlertItem[] = [];

    // Add alerts for high-risk opportunities
    opportunities
      .filter(o => o.risk_level === 'high')
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
    if (performance && performance.weekly.percentage < 50) {
      generatedAlerts.push({
        id: 'alert-performance',
        type: 'ai_insight',
        title: 'Insight de Performance',
        message: `Estás a ${performance.weekly.percentage}% da meta semanal. Precisas de ${performance.dealsToClose} negócios para recuperar.`,
        timestamp: new Date().toISOString(),
      });
    }

    setAlerts(generatedAlerts);
  };

  const updatePriorityStatus = (id: string, status: PriorityAction['status']) => {
    setPriorities(prev => 
      prev.map(p => p.id === id ? { ...p, status } : p)
    );
  };

  useEffect(() => {
    const loadData = async () => {
      if (!currentWorkspace?.id || !user?.id) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      await Promise.all([
        fetchMeetings(),
        fetchOpportunities(),
        fetchPerformance(),
      ]);
      setIsLoading(false);
    };

    loadData();
  }, [currentWorkspace?.id, user?.id]);

  useEffect(() => {
    if (!isLoading && meetings.length >= 0 && opportunities.length >= 0) {
      generatePriorities();
      generateAlerts();
    }
  }, [isLoading, meetings, opportunities, performance]);

  const daySummary = useMemo(() => {
    const criticalTasks = priorities.filter(p => p.priority === 'high' && p.status === 'pending').length;
    const riskyOpps = opportunities.filter(o => o.risk_level === 'high').length;
    const weeklyProgress = performance?.weekly.percentage || 0;

    return {
      meetingsCount: meetings.length,
      criticalTasks,
      riskyOpps,
      weeklyProgress,
      summaryText: `Hoje tens ${meetings.length} reunião${meetings.length !== 1 ? 'ões' : ''}, ${criticalTasks} tarefa${criticalTasks !== 1 ? 's' : ''} crítica${criticalTasks !== 1 ? 's' : ''} e estás a ${weeklyProgress}% da meta semanal.`,
    };
  }, [meetings, priorities, opportunities, performance]);

  return {
    isLoading,
    greeting,
    daySummary,
    meetings,
    priorities,
    followUps,
    opportunities,
    performance,
    alerts,
    updatePriorityStatus,
    refresh: async () => {
      await Promise.all([
        fetchMeetings(),
        fetchOpportunities(),
        fetchPerformance(),
      ]);
    },
  };
}
