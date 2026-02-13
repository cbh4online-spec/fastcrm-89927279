import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';

export type AnalyticsPeriod = '7d' | '30d' | '90d';

interface DailyData {
  date: string;
  started: number;
  completed: number;
  abandoned: number;
  handedOff: number;
  goals: number;
  avgDuration: number;
}

interface AnalyticsTotals {
  started: number;
  completed: number;
  abandoned: number;
  handedOff: number;
  goals: number;
  avgDuration: number;
  conversionValue: number;
  completionRate: number;
}

export function useFlowAnalytics(flowId: string | null, period: AnalyticsPeriod = '30d') {
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const workspaceContext = useWorkspace();
  const currentWorkspace = workspaceContext?.currentWorkspace;

  const periodDays = period === '7d' ? 7 : period === '30d' ? 30 : 90;

  useEffect(() => {
    if (!currentWorkspace?.id || !flowId) {
      setDailyData([]);
      return;
    }

    const fetchAnalytics = async () => {
      setIsLoading(true);
      try {
        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - periodDays);

        const { data, error } = await supabase
          .from('flow_analytics')
          .select('*')
          .eq('workspace_id', currentWorkspace.id)
          .eq('flow_id', flowId)
          .gte('date', fromDate.toISOString().split('T')[0])
          .order('date', { ascending: true });

        if (error) {
          console.error('[useFlowAnalytics] Error:', error);
          setDailyData([]);
          return;
        }

        const mapped: DailyData[] = (data || []).map((row) => ({
          date: row.date,
          started: row.sessions_started ?? 0,
          completed: row.sessions_completed ?? 0,
          abandoned: row.sessions_abandoned ?? 0,
          handedOff: row.sessions_handed_off ?? 0,
          goals: row.goals_achieved ?? 0,
          avgDuration: row.avg_duration_seconds ?? 0,
        }));

        setDailyData(mapped);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, [currentWorkspace?.id, flowId, periodDays]);

  const totals = useMemo<AnalyticsTotals>(() => {
    if (dailyData.length === 0) {
      return { started: 0, completed: 0, abandoned: 0, handedOff: 0, goals: 0, avgDuration: 0, conversionValue: 0, completionRate: 0 };
    }

    const started = dailyData.reduce((s, d) => s + d.started, 0);
    const completed = dailyData.reduce((s, d) => s + d.completed, 0);
    const abandoned = dailyData.reduce((s, d) => s + d.abandoned, 0);
    const handedOff = dailyData.reduce((s, d) => s + d.handedOff, 0);
    const goals = dailyData.reduce((s, d) => s + d.goals, 0);
    const totalDuration = dailyData.reduce((s, d) => s + d.avgDuration, 0);
    const avgDuration = dailyData.length > 0 ? Math.round(totalDuration / dailyData.length) : 0;
    const completionRate = started > 0 ? Math.round((completed / started) * 100) : 0;

    return { started, completed, abandoned, handedOff, goals, avgDuration, conversionValue: 0, completionRate };
  }, [dailyData]);

  return { dailyData, totals, isLoading };
}
