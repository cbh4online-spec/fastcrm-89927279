import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { startOfMonth, endOfMonth, subMonths, format, differenceInHours, getDay, getHours, isAfter, isBefore } from 'date-fns';

export interface SchedulingKPIs {
  totalBookings: number;
  confirmedBookings: number;
  cancelledBookings: number;
  noShowCount: number;
  noShowRate: number;
  avgLeadTimeDays: number;
  bookingsThisMonth: number;
  bookingsLastMonth: number;
  monthlyGrowth: number;
  popularHours: { hour: number; count: number }[];
  popularDays: { day: number; count: number }[];
  heatmapData: { day: number; hour: number; count: number }[];
  monthlyTrend: { month: string; count: number }[];
  statusBreakdown: { status: string; count: number }[];
}

export function useSchedulingAnalytics() {
  const { currentWorkspace } = useWorkspace();

  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['scheduling-analytics-events', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const sixMonthsAgo = subMonths(new Date(), 6).toISOString();
      const { data, error } = await supabase
        .from('calendar_events')
        .select('id, title, start_time, end_time, status, created_at, calendar_id')
        .gte('start_time', sixMonthsAgo)
        .order('start_time', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentWorkspace?.id,
  });

  const { data: meetings = [], isLoading: meetingsLoading } = useQuery({
    queryKey: ['scheduling-analytics-meetings', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const sixMonthsAgo = subMonths(new Date(), 6).toISOString();
      const { data, error } = await supabase
        .from('meetings')
        .select('id, title, start_time, status, created_at, no_show')
        .eq('workspace_id', currentWorkspace.id)
        .gte('start_time', sixMonthsAgo)
        .order('start_time', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentWorkspace?.id,
  });

  const { data: bookingPages = [], isLoading: pagesLoading } = useQuery({
    queryKey: ['scheduling-analytics-pages', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const { data, error } = await supabase
        .from('booking_pages' as any)
        .select('id, title, slug, is_active')
        .eq('workspace_id', currentWorkspace.id);
      if (error) throw error;
      return (data || []) as unknown as { id: string; title: string; slug: string; is_active: boolean }[];
    },
    enabled: !!currentWorkspace?.id,
  });

  const kpis = useMemo<SchedulingKPIs>(() => {
    const now = new Date();
    const thisMonthStart = startOfMonth(now);
    const thisMonthEnd = endOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));

    // Combine events + meetings for unified metrics
    const allItems = [
      ...events.map(e => ({
        date: new Date(e.start_time),
        createdAt: new Date(e.created_at),
        status: e.status || 'confirmed',
        noShow: false,
      })),
      ...meetings.map((m: any) => ({
        date: new Date(m.start_time),
        createdAt: new Date(m.created_at),
        status: m.status || 'scheduled',
        noShow: m.no_show || false,
      })),
    ];

    const total = allItems.length;
    const confirmed = allItems.filter(i => ['confirmed', 'completed', 'scheduled'].includes(i.status)).length;
    const cancelled = allItems.filter(i => ['cancelled'].includes(i.status)).length;
    const noShows = allItems.filter(i => i.noShow).length;
    const noShowRate = total > 0 ? (noShows / total) * 100 : 0;

    // Avg lead time (hours between created and scheduled)
    const leadTimes = allItems
      .filter(i => i.createdAt && i.date)
      .map(i => differenceInHours(i.date, i.createdAt))
      .filter(h => h > 0);
    const avgLeadTimeHours = leadTimes.length > 0 ? leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length : 0;
    const avgLeadTimeDays = Math.round(avgLeadTimeHours / 24 * 10) / 10;

    // Monthly counts
    const thisMonth = allItems.filter(i => i.date >= thisMonthStart && i.date <= thisMonthEnd).length;
    const lastMonth = allItems.filter(i => i.date >= lastMonthStart && i.date <= lastMonthEnd).length;
    const growth = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : 0;

    // Popular hours (0-23)
    const hourCounts: Record<number, number> = {};
    allItems.forEach(i => {
      const h = getHours(i.date);
      hourCounts[h] = (hourCounts[h] || 0) + 1;
    });
    const popularHours = Object.entries(hourCounts)
      .map(([h, c]) => ({ hour: Number(h), count: c }))
      .sort((a, b) => b.count - a.count);

    // Popular days (0=Sun, 6=Sat)
    const dayCounts: Record<number, number> = {};
    allItems.forEach(i => {
      const d = getDay(i.date);
      dayCounts[d] = (dayCounts[d] || 0) + 1;
    });
    const popularDays = Object.entries(dayCounts)
      .map(([d, c]) => ({ day: Number(d), count: c }))
      .sort((a, b) => a.day - b.day);

    // Heatmap data (day x hour)
    const heatmap: Record<string, number> = {};
    allItems.forEach(i => {
      const key = `${getDay(i.date)}-${getHours(i.date)}`;
      heatmap[key] = (heatmap[key] || 0) + 1;
    });
    const heatmapData = Object.entries(heatmap).map(([key, count]) => {
      const [day, hour] = key.split('-').map(Number);
      return { day, hour, count };
    });

    // Monthly trend (last 6 months)
    const monthlyTrend: { month: string; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const m = subMonths(now, i);
      const mStart = startOfMonth(m);
      const mEnd = endOfMonth(m);
      const count = allItems.filter(item => item.date >= mStart && item.date <= mEnd).length;
      monthlyTrend.push({ month: format(m, 'MMM'), count });
    }

    // Status breakdown
    const statusMap: Record<string, number> = {};
    allItems.forEach(i => {
      statusMap[i.status] = (statusMap[i.status] || 0) + 1;
    });
    const statusBreakdown = Object.entries(statusMap).map(([status, count]) => ({ status, count }));

    return {
      totalBookings: total,
      confirmedBookings: confirmed,
      cancelledBookings: cancelled,
      noShowCount: noShows,
      noShowRate: Math.round(noShowRate * 10) / 10,
      avgLeadTimeDays,
      bookingsThisMonth: thisMonth,
      bookingsLastMonth: lastMonth,
      monthlyGrowth: Math.round(growth),
      popularHours,
      popularDays,
      heatmapData,
      monthlyTrend,
      statusBreakdown,
    };
  }, [events, meetings]);

  return {
    kpis,
    bookingPages,
    isLoading: eventsLoading || meetingsLoading || pagesLoading,
  };
}
