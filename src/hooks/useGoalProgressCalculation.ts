import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { ProductivityGoal } from './useProductivityCoach';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek } from 'date-fns';

/**
 * Get dynamic date range for rolling periods (daily/weekly)
 * For daily: always use today
 * For weekly: always use current week (Monday-Sunday)
 */
function getDynamicDateRange(goal: ProductivityGoal): { start: string; end: string } {
  const now = new Date();
  
  if (goal.period === 'daily') {
    const today = format(startOfDay(now), 'yyyy-MM-dd');
    return { start: today, end: today };
  }
  
  if (goal.period === 'weekly') {
    const weekStart = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const weekEnd = format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    return { start: weekStart, end: weekEnd };
  }
  
  // For other periods, use the stored dates
  return { start: goal.period_start, end: goal.period_end };
}

/**
 * Unit to metric mapping
 * Maps goal units to their respective data sources for automatic progress calculation
 */
type MetricSource = {
  table: string;
  sumField?: string; // Field to sum (for value-based metrics)
  dateField: string; // Field to filter by date range
  statusFilter?: { field: string; value: string | string[] }; // Optional status filter
  userField?: string; // Field that contains user_id for individual goals
};

const UNIT_METRIC_MAP: Record<string, MetricSource> = {
  // Sales metrics
  'vendas': {
    table: 'opportunities',
    dateField: 'updated_at',
    statusFilter: { field: 'status', value: 'won' },
    userField: 'owner_id',
  },
  'negocios': {
    table: 'opportunities',
    dateField: 'created_at',
    userField: 'owner_id',
  },
  'contratos': {
    table: 'opportunities',
    dateField: 'updated_at',
    statusFilter: { field: 'status', value: 'won' },
    userField: 'owner_id',
  },
  
  // Relationship metrics
  'reunioes': {
    table: 'calendar_events',
    dateField: 'start_time',
    userField: 'created_by',
  },
  'chamadas': {
    table: 'activities',
    dateField: 'created_at',
    statusFilter: { field: 'type', value: 'call' },
    userField: 'created_by',
  },
  'emails': {
    table: 'activities',
    dateField: 'created_at',
    statusFilter: { field: 'type', value: 'email' },
    userField: 'created_by',
  },
  'contactos': {
    table: 'contacts',
    dateField: 'created_at',
    userField: 'created_by',
  },
  
  // Financial metrics (sum values)
  'euros': {
    table: 'opportunities',
    sumField: 'value',
    dateField: 'updated_at',
    statusFilter: { field: 'status', value: 'won' },
    userField: 'owner_id',
  },
  '€ (Euro)': {
    table: 'opportunities',
    sumField: 'value',
    dateField: 'updated_at',
    statusFilter: { field: 'status', value: 'won' },
    userField: 'owner_id',
  },
  'faturacao': {
    table: 'opportunities',
    sumField: 'value',
    dateField: 'updated_at',
    statusFilter: { field: 'status', value: 'won' },
    userField: 'owner_id',
  },
  'faturação': {
    table: 'opportunities',
    sumField: 'value',
    dateField: 'updated_at',
    statusFilter: { field: 'status', value: 'won' },
    userField: 'owner_id',
  },
  'comissoes': {
    table: 'opportunities',
    sumField: 'value',
    dateField: 'updated_at',
    statusFilter: { field: 'status', value: 'won' },
    userField: 'owner_id',
  },
  
  // Task metrics
  'tarefas': {
    table: 'tasks',
    dateField: 'updated_at',
    statusFilter: { field: 'status', value: 'done' },
    userField: 'assigned_to',
  },
  'propostas': {
    table: 'proposals',
    dateField: 'created_at',
    userField: 'created_by',
  },
  
  // Lead metrics
  'leads': {
    table: 'leads',
    dateField: 'created_at',
    userField: 'created_by',
  },
};

/**
 * Normalizes unit string to match metric map keys
 */
function normalizeUnit(unit: string | null): string | null {
  if (!unit) return null;
  
  // First check if exact match exists
  if (UNIT_METRIC_MAP[unit]) return unit;
  
  // Try lowercase match
  const lowerUnit = unit.toLowerCase();
  const matchingKey = Object.keys(UNIT_METRIC_MAP).find(
    key => key.toLowerCase() === lowerUnit
  );
  
  return matchingKey || null;
}

/**
 * Calculates progress for a goal using direct SQL-like query
 */
async function calculateGoalProgress(
  goal: ProductivityGoal,
  workspaceId: string,
  metricSource: MetricSource
): Promise<{ calculatedValue: number; isAutomatic: boolean; source: string } | null> {
  try {
    // Get dynamic date range for rolling periods (daily/weekly)
    const dateRange = getDynamicDateRange(goal);
    
    // Build filter conditions
    const filters: string[] = [
      `workspace_id.eq.${workspaceId}`,
      `${metricSource.dateField}.gte.${dateRange.start}`,
      `${metricSource.dateField}.lte.${dateRange.end}T23:59:59`,
    ];
    
    // Add status filter
    if (metricSource.statusFilter) {
      const { field, value } = metricSource.statusFilter;
      if (Array.isArray(value)) {
        filters.push(`${field}.in.(${value.join(',')})`);
      } else {
        filters.push(`${field}.eq.${value}`);
      }
    }
    
    // Add user filter for individual goals
    if (goal.goal_scope === 'individual' && goal.user_id && metricSource.userField) {
      filters.push(`${metricSource.userField}.eq.${goal.user_id}`);
    }
    
    // Use RPC to count or sum based on metric type
    if (metricSource.sumField) {
      // For sum queries, we need to fetch the data and sum client-side
      // Apply user filter for individual goals
      const isIndividual = goal.goal_scope === 'individual' && goal.user_id && metricSource.userField;
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let result: { data: any[] | null; error: any };
      
      if (isIndividual) {
        result = await supabase
          .from('opportunities')
          .select('value')
          .eq('workspace_id', workspaceId)
          .eq('status', 'won')
          .eq('owner_id', goal.user_id!)
          .gte(metricSource.dateField, dateRange.start)
          .lte(metricSource.dateField, dateRange.end + 'T23:59:59');
      } else {
        result = await supabase
          .from('opportunities')
          .select('value')
          .eq('workspace_id', workspaceId)
          .eq('status', 'won')
          .gte(metricSource.dateField, dateRange.start)
          .lte(metricSource.dateField, dateRange.end + 'T23:59:59');
      }
      
      if (result.error) {
        console.error('Error calculating goal progress:', result.error);
        return null;
      }
      
      console.log('Goal progress calculation:', {
        goalId: goal.id,
        goalTitle: goal.title,
        period: goal.period,
        dateRange,
        dataCount: result.data?.length || 0,
        rawData: result.data
      });
      
      // Sum the values
      const calculatedValue = (result.data || []).reduce((sum, item) => {
        return sum + (Number(item.value) || 0);
      }, 0);
      
      return {
        calculatedValue,
        isAutomatic: true,
        source: metricSource.table,
      };
    } else {
      // For count queries, use count: 'exact'
      // Route to specific tables based on metric source
      let count = 0;
      
      switch (metricSource.table) {
        case 'opportunities': {
          const { count: c, error } = await supabase
            .from('opportunities')
            .select('id', { count: 'exact', head: true })
            .eq('workspace_id', workspaceId)
            .gte(metricSource.dateField, dateRange.start)
            .lte(metricSource.dateField, dateRange.end + 'T23:59:59');
          if (error) throw error;
          count = c || 0;
          break;
        }
        case 'leads': {
          const { count: c, error } = await supabase
            .from('leads')
            .select('id', { count: 'exact', head: true })
            .eq('workspace_id', workspaceId)
            .gte(metricSource.dateField, dateRange.start)
            .lte(metricSource.dateField, dateRange.end + 'T23:59:59');
          if (error) throw error;
          count = c || 0;
          break;
        }
        case 'contacts': {
          const { count: c, error } = await supabase
            .from('contacts')
            .select('id', { count: 'exact', head: true })
            .eq('workspace_id', workspaceId)
            .gte(metricSource.dateField, dateRange.start)
            .lte(metricSource.dateField, dateRange.end + 'T23:59:59');
          if (error) throw error;
          count = c || 0;
          break;
        }
        case 'tasks': {
          const { count: c, error } = await supabase
            .from('tasks')
            .select('id', { count: 'exact', head: true })
            .eq('workspace_id', workspaceId)
            .eq('status', 'done')
            .gte(metricSource.dateField, dateRange.start)
            .lte(metricSource.dateField, dateRange.end + 'T23:59:59');
          if (error) throw error;
          count = c || 0;
          break;
        }
        case 'calendar_events': {
          const { count: c, error } = await supabase
            .from('calendar_events')
            .select('id', { count: 'exact', head: true })
            .eq('workspace_id', workspaceId)
            .gte(metricSource.dateField, dateRange.start)
            .lte(metricSource.dateField, dateRange.end + 'T23:59:59');
          if (error) throw error;
          count = c || 0;
          break;
        }
        case 'proposals': {
          const { count: c, error } = await supabase
            .from('proposals')
            .select('id', { count: 'exact', head: true })
            .eq('workspace_id', workspaceId)
            .gte(metricSource.dateField, dateRange.start)
            .lte(metricSource.dateField, dateRange.end + 'T23:59:59');
          if (error) throw error;
          count = c || 0;
          break;
        }
        default:
          return null;
      }
      
      return {
        calculatedValue: count,
        isAutomatic: true,
        source: metricSource.table,
      };
    }
  } catch (error) {
    console.error('Error in goal progress calculation:', error);
    return null;
  }
}

/**
 * Hook to calculate automatic progress for multiple goals
 */
export function useGoalsProgress(goals: ProductivityGoal[]) {
  const { currentWorkspace } = useWorkspace();
  
  return useQuery({
    queryKey: ['goals-progress-batch', currentWorkspace?.id, goals.map(g => g.id).join(',')],
    queryFn: async () => {
      if (!currentWorkspace?.id || goals.length === 0) {
        return {};
      }
      
      const progressMap: Record<string, { calculatedValue: number; isAutomatic: boolean; source: string }> = {};
      
      // Process each goal
      await Promise.all(
        goals.map(async (goal) => {
          const normalizedUnit = normalizeUnit(goal.unit);
          const metricSource = normalizedUnit ? UNIT_METRIC_MAP[normalizedUnit] : null;
          
          if (!metricSource) {
            // No automatic calculation available
            return;
          }
          
          const result = await calculateGoalProgress(goal, currentWorkspace.id, metricSource);
          if (result) {
            progressMap[goal.id] = result;
          }
        })
      );
      
      return progressMap;
    },
    enabled: !!currentWorkspace?.id && goals.length > 0,
    staleTime: 60000,
    refetchInterval: 300000,
  });
}

/**
 * Check if a unit supports automatic calculation
 */
export function isAutoCalculatedUnit(unit: string | null): boolean {
  if (!unit) return false;
  return !!normalizeUnit(unit);
}

/**
 * Get the data source for a unit
 */
export function getUnitDataSource(unit: string | null): string | null {
  if (!unit) return null;
  const normalizedUnit = normalizeUnit(unit);
  if (!normalizedUnit) return null;
  return UNIT_METRIC_MAP[normalizedUnit]?.table || null;
}
