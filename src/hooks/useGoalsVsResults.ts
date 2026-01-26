import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { differenceInDays, format, subDays, subWeeks, endOfDay, startOfWeek, endOfWeek, startOfDay } from "date-fns";
import type { GoalPeriod, GoalScope, ProductivityGoal } from "./useProductivityCoach";

export type GoalRealStatus = 'completed' | 'ahead' | 'on_track' | 'at_risk' | 'behind';
export type TrendDirection = 'up' | 'down' | 'stable';

export interface GoalWithRealProgress {
  goal: ProductivityGoal;
  realValue: number;
  manualValue: number;
  targetValue: number;
  realProgress: number;
  manualProgress: number;
  variance: number;
  status: GoalRealStatus;
  historicalData: { date: string; value: number }[];
  // New intelligent evaluation fields
  averageValue7d: number;      // Average of last 7 days (for daily goals)
  averageValue30d: number;     // Average of last 30 days (for daily goals)
  averageWeekly4w: number;     // Average of last 4 weeks (for weekly goals)
  projectedValue: number;      // Projected value at period end
  projectedProgress: number;   // Projected progress at period end
  trendDirection: TrendDirection; // Trend direction
  daysElapsed: number;         // Days elapsed in current period
  totalDays: number;           // Total days in period
}

export interface GoalsVsResultsFilters {
  period?: GoalPeriod | 'all';
  memberId?: string | 'all';
  scope?: GoalScope | 'all';
}

// Unit categories for database queries
type UnitCategory = 'sales' | 'leads' | 'opportunities' | 'tasks' | 'meetings' | 'revenue';

// Normalize strings by removing accents and converting to lowercase
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

// Map using normalized keys (no accents, lowercase)
const UNIT_CATEGORY_MAP: Record<string, UnitCategory> = {
  // Sales / Vendas
  'vendas': 'sales',
  'sales': 'sales',
  'negocios': 'sales',
  'contratos': 'sales',
  
  // Leads
  'leads': 'leads',
  'contactos': 'leads',
  'contacts': 'leads',
  
  // Opportunities
  'oportunidades': 'opportunities',
  'opportunities': 'opportunities',
  
  // Meetings
  'reunioes': 'meetings',
  'reunions': 'meetings',
  'meetings': 'meetings',
  
  // Tasks
  'tarefas': 'tasks',
  'tasks': 'tasks',
  
  // Revenue / Faturação
  'faturacao': 'revenue',
  'facturacao': 'revenue',
  'revenue': 'revenue',
  'euros': 'revenue',
  'e (euro)': 'revenue',
};

// Calculate status based on progress, time remaining, and context
function calculateStatus(
  realProgress: number, 
  daysRemaining: number, 
  totalDays: number,
  averageProgress?: number // Optional: average-based progress for context
): GoalRealStatus {
  if (realProgress >= 100) return 'completed';
  
  const expectedProgress = totalDays > 0 
    ? ((totalDays - Math.max(0, daysRemaining)) / totalDays) * 100 
    : 100;
  
  // For daily/weekly goals, consider average performance too
  if (averageProgress !== undefined && averageProgress >= 80) {
    // If average is good, be more lenient on current period
    if (realProgress >= expectedProgress * 0.5) return 'on_track';
  }
  
  if (realProgress >= expectedProgress * 1.1) return 'ahead';
  if (realProgress >= expectedProgress * 0.8) return 'on_track';
  if (realProgress >= expectedProgress * 0.5) return 'at_risk';
  return 'behind';
}

// Calculate trend direction by comparing short-term vs long-term averages
function calculateTrend(shortTermAvg: number, longTermAvg: number): TrendDirection {
  if (longTermAvg === 0) return 'stable';
  const changePercent = ((shortTermAvg - longTermAvg) / longTermAvg) * 100;
  if (changePercent > 10) return 'up';
  if (changePercent < -10) return 'down';
  return 'stable';
}

// Calculate projection for goals in progress
function calculateProjection(currentValue: number, daysElapsed: number, totalDays: number): number {
  if (daysElapsed === 0) return currentValue;
  const dailyRate = currentValue / daysElapsed;
  return dailyRate * totalDays;
}

// Fetch count/sum for a specific unit type - separated queries to avoid type recursion
async function fetchSalesCount(
  workspaceId: string,
  periodStart: string,
  periodEnd: string,
  userId: string | null
): Promise<number> {
  if (userId) {
    const { count } = await supabase
      .from('opportunities')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('status', 'won')
      .eq('owner_id', userId)
      .gte('expected_close_date', periodStart)
      .lte('expected_close_date', periodEnd);
    return count || 0;
  }
  const { count } = await supabase
    .from('opportunities')
    .select('*', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)
    .eq('status', 'won')
    .gte('expected_close_date', periodStart)
    .lte('expected_close_date', periodEnd);
  return count || 0;
}

async function fetchRevenueSum(
  workspaceId: string,
  periodStart: string,
  periodEnd: string,
  userId: string | null
): Promise<number> {
  if (userId) {
    const { data } = await supabase
      .from('opportunities')
      .select('value')
      .eq('workspace_id', workspaceId)
      .eq('status', 'won')
      .eq('owner_id', userId)
      .gte('expected_close_date', periodStart)
      .lte('expected_close_date', periodEnd);
    return data?.reduce((sum, r) => sum + (r.value || 0), 0) || 0;
  }
  const { data } = await supabase
    .from('opportunities')
    .select('value')
    .eq('workspace_id', workspaceId)
    .eq('status', 'won')
    .gte('expected_close_date', periodStart)
    .lte('expected_close_date', periodEnd);
  return data?.reduce((sum, r) => sum + (r.value || 0), 0) || 0;
}

async function fetchLeadsCount(
  workspaceId: string,
  periodStart: string,
  periodEnd: string,
  userId: string | null
): Promise<number> {
  if (userId) {
    const { count } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('created_by', userId)
      .gte('created_at', periodStart)
      .lte('created_at', periodEnd);
    return count || 0;
  }
  const { count } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)
    .gte('created_at', periodStart)
    .lte('created_at', periodEnd);
  return count || 0;
}

async function fetchOpportunitiesCount(
  workspaceId: string,
  periodStart: string,
  periodEnd: string,
  userId: string | null
): Promise<number> {
  if (userId) {
    const { count } = await supabase
      .from('opportunities')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('owner_id', userId)
      .gte('created_at', periodStart)
      .lte('created_at', periodEnd);
    return count || 0;
  }
  const { count } = await supabase
    .from('opportunities')
    .select('*', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)
    .gte('created_at', periodStart)
    .lte('created_at', periodEnd);
  return count || 0;
}

async function fetchTasksCount(
  workspaceId: string,
  periodStart: string,
  periodEnd: string,
  userId: string | null
): Promise<number> {
  // Use explicit any cast to avoid TypeScript recursion issues with Supabase types
  const baseQuery = supabase
    .from('tasks')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)
    .eq('status', 'done')
    .gte('completed_at', periodStart)
    .lte('completed_at', periodEnd);

  if (userId) {
    const result = await (baseQuery as any).eq('created_by', userId);
    return result.count || 0;
  }
  
  const { count } = await baseQuery;
  return count || 0;
}

async function fetchMeetingsCount(
  workspaceId: string,
  periodStart: string,
  periodEnd: string,
  userId: string | null
): Promise<number> {
  if (userId) {
    const { count } = await supabase
      .from('meetings')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('status', 'completed')
      .eq('created_by', userId)
      .gte('start_time', periodStart)
      .lte('start_time', periodEnd);
    return count || 0;
  }
  const { count } = await supabase
    .from('meetings')
    .select('*', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)
    .eq('status', 'completed')
    .gte('start_time', periodStart)
    .lte('start_time', periodEnd);
  return count || 0;
}

// Main fetch function that routes to specific fetchers
async function fetchUnitValue(
  category: UnitCategory,
  workspaceId: string,
  periodStart: string,
  periodEnd: string,
  userId: string | null
): Promise<number> {
  switch (category) {
    case 'sales':
      return fetchSalesCount(workspaceId, periodStart, periodEnd, userId);
    case 'revenue':
      return fetchRevenueSum(workspaceId, periodStart, periodEnd, userId);
    case 'leads':
      return fetchLeadsCount(workspaceId, periodStart, periodEnd, userId);
    case 'opportunities':
      return fetchOpportunitiesCount(workspaceId, periodStart, periodEnd, userId);
    case 'tasks':
      return fetchTasksCount(workspaceId, periodStart, periodEnd, userId);
    case 'meetings':
      return fetchMeetingsCount(workspaceId, periodStart, periodEnd, userId);
    default:
      return 0;
  }
}

export function useGoalsVsResults(filters: GoalsVsResultsFilters = {}) {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const { period = 'all', memberId = 'all', scope = 'all' } = filters;

  return useQuery({
    queryKey: ['goals-vs-results', currentWorkspace?.id, period, memberId, scope],
    queryFn: async (): Promise<GoalWithRealProgress[]> => {
      if (!currentWorkspace || !user) return [];

      // Fetch goals with filters
      const { data: goals, error: goalsError } = await supabase
        .from('productivity_goals')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .then(async (result) => {
          if (result.error) return result;
          
          let filteredData = result.data || [];
          
          if (period !== 'all') {
            filteredData = filteredData.filter(g => g.period === period);
          }
          
          if (memberId !== 'all') {
            filteredData = filteredData.filter(g => g.user_id === memberId);
          }
          
          if (scope !== 'all') {
            filteredData = filteredData.filter(g => g.goal_scope === scope);
          }
          
          return { ...result, data: filteredData };
        });

      if (goalsError) throw goalsError;
      if (!goals || goals.length === 0) return [];

      // Calculate real progress for each goal
      const goalsWithProgress: GoalWithRealProgress[] = await Promise.all(
        goals.map(async (goal) => {
          const typedGoal = goal as unknown as ProductivityGoal;
          const normalizedUnit = typedGoal.unit ? normalizeString(typedGoal.unit) : null;
          const unitCategory = normalizedUnit ? UNIT_CATEGORY_MAP[normalizedUnit] : null;
          
          let realValue = 0;
          let averageValue7d = 0;
          let averageValue30d = 0;
          let averageWeekly4w = 0;
          const historicalData: { date: string; value: number }[] = [];
          
          const today = new Date();
          const todayStart = format(startOfDay(today), "yyyy-MM-dd'T'HH:mm:ss");
          const todayEnd = format(endOfDay(today), "yyyy-MM-dd'T'HH:mm:ss");
          
          if (unitCategory) {
            const userId = typedGoal.goal_scope === 'individual' ? typedGoal.user_id : null;
            
            // Calculate real value for the period
            realValue = await fetchUnitValue(
              unitCategory,
              currentWorkspace.id,
              typedGoal.period_start,
              typedGoal.period_end,
              userId
            );

            // Calculate averages based on goal period type
            if (typedGoal.period === 'daily') {
              // For daily goals: calculate 7-day and 30-day averages
              const last7DaysStart = format(subDays(today, 7), "yyyy-MM-dd'T'HH:mm:ss");
              const last30DaysStart = format(subDays(today, 30), "yyyy-MM-dd'T'HH:mm:ss");
              
              const total7d = await fetchUnitValue(unitCategory, currentWorkspace.id, last7DaysStart, todayEnd, userId);
              const total30d = await fetchUnitValue(unitCategory, currentWorkspace.id, last30DaysStart, todayEnd, userId);
              
              averageValue7d = total7d / 7;
              averageValue30d = total30d / 30;
            } else if (typedGoal.period === 'weekly') {
              // For weekly goals: calculate 4-week average (excluding current week)
              const lastWeekEnd = format(endOfWeek(subWeeks(today, 1), { weekStartsOn: 1 }), "yyyy-MM-dd'T'HH:mm:ss");
              const fourWeeksAgoStart = format(startOfWeek(subWeeks(today, 4), { weekStartsOn: 1 }), "yyyy-MM-dd'T'HH:mm:ss");
              
              const total4w = await fetchUnitValue(unitCategory, currentWorkspace.id, fourWeeksAgoStart, lastWeekEnd, userId);
              averageWeekly4w = total4w / 4;
            }

            // Generate historical data (last 7 days or period length)
            const periodStart = new Date(typedGoal.period_start);
            const periodEnd = new Date(typedGoal.period_end);
            const daysInPeriod = Math.min(
              differenceInDays(periodEnd, periodStart) + 1,
              7
            );

            for (let i = daysInPeriod - 1; i >= 0; i--) {
              const date = subDays(today > periodEnd ? periodEnd : today, i);
              if (date < periodStart) continue;

              const dayValue = await fetchUnitValue(
                unitCategory,
                currentWorkspace.id,
                typedGoal.period_start,
                format(endOfDay(date), "yyyy-MM-dd'T'HH:mm:ss"),
                userId
              );

              historicalData.push({
                date: format(date, 'yyyy-MM-dd'),
                value: dayValue,
              });
            }
          }

          const targetValue = typedGoal.target_value || 0;
          const manualValue = typedGoal.current_value || 0;
          const realProgress = targetValue > 0 ? (realValue / targetValue) * 100 : 0;
          const manualProgress = targetValue > 0 ? (manualValue / targetValue) * 100 : 0;
          const variance = realValue - manualValue;

          const periodEndDate = new Date(typedGoal.period_end);
          const periodStartDate = new Date(typedGoal.period_start);
          const daysRemaining = Math.max(0, differenceInDays(periodEndDate, today));
          const totalDays = differenceInDays(periodEndDate, periodStartDate) + 1;
          const daysElapsed = Math.max(0, totalDays - daysRemaining);

          // Calculate projection
          const projectedValue = calculateProjection(realValue, daysElapsed, totalDays);
          const projectedProgress = targetValue > 0 ? Math.min((projectedValue / targetValue) * 100, 200) : 0;

          // Calculate trend direction
          let trendDirection: TrendDirection = 'stable';
          if (typedGoal.period === 'daily') {
            trendDirection = calculateTrend(averageValue7d, averageValue30d);
          } else if (typedGoal.period === 'weekly') {
            // Compare current week progress with 4-week average
            trendDirection = calculateTrend(realValue, averageWeekly4w);
          }

          // For daily/weekly goals, use average-based status calculation
          const averageProgress = typedGoal.period === 'daily' 
            ? (targetValue > 0 ? (averageValue7d / targetValue) * 100 : 0)
            : undefined;

          return {
            goal: typedGoal,
            realValue,
            manualValue,
            targetValue,
            realProgress: Math.min(realProgress, 100),
            manualProgress: Math.min(manualProgress, 100),
            variance,
            status: calculateStatus(realProgress, daysRemaining, totalDays, averageProgress),
            historicalData,
            averageValue7d,
            averageValue30d,
            averageWeekly4w,
            projectedValue,
            projectedProgress,
            trendDirection,
            daysElapsed,
            totalDays,
          };
        })
      );

      return goalsWithProgress;
    },
    enabled: !!currentWorkspace && !!user,
    staleTime: 0, // Always fetch fresh data
    refetchOnWindowFocus: true,
  });
}

// Helper hook to get summary statistics
export function useGoalsVsResultsSummary(goalsData: GoalWithRealProgress[] | undefined) {
  if (!goalsData || goalsData.length === 0) {
    return {
      totalGoals: 0,
      completedGoals: 0,
      globalProgress: 0,
      aheadCount: 0,
      onTrackCount: 0,
      atRiskCount: 0,
      behindCount: 0,
    };
  }

  const totalGoals = goalsData.length;
  const completedGoals = goalsData.filter(g => g.status === 'completed').length;
  const aheadCount = goalsData.filter(g => g.status === 'ahead').length;
  const onTrackCount = goalsData.filter(g => g.status === 'on_track').length;
  const atRiskCount = goalsData.filter(g => g.status === 'at_risk').length;
  const behindCount = goalsData.filter(g => g.status === 'behind').length;
  
  const globalProgress = goalsData.reduce((sum, g) => sum + g.realProgress, 0) / totalGoals;

  return {
    totalGoals,
    completedGoals,
    globalProgress,
    aheadCount,
    onTrackCount,
    atRiskCount,
    behindCount,
  };
}
