import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { ProductivityGoal } from './useProductivityCoach';

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
    // Build filter conditions
    const filters: string[] = [
      `workspace_id.eq.${workspaceId}`,
      `${metricSource.dateField}.gte.${goal.period_start}`,
      `${metricSource.dateField}.lte.${goal.period_end}T23:59:59`,
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
      const { data, error } = await supabase
        .from('opportunities')
        .select('value')
        .eq('workspace_id', workspaceId)
        .eq('status', 'won')
        .gte(metricSource.dateField, goal.period_start)
        .lte(metricSource.dateField, goal.period_end + 'T23:59:59');
      
      if (error) {
        console.error('Error calculating goal progress:', error);
        return null;
      }
      
      // Sum the values
      const calculatedValue = (data || []).reduce((sum, item) => {
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
            .gte(metricSource.dateField, goal.period_start)
            .lte(metricSource.dateField, goal.period_end + 'T23:59:59');
          if (error) throw error;
          count = c || 0;
          break;
        }
        case 'leads': {
          const { count: c, error } = await supabase
            .from('leads')
            .select('id', { count: 'exact', head: true })
            .eq('workspace_id', workspaceId)
            .gte(metricSource.dateField, goal.period_start)
            .lte(metricSource.dateField, goal.period_end + 'T23:59:59');
          if (error) throw error;
          count = c || 0;
          break;
        }
        case 'contacts': {
          const { count: c, error } = await supabase
            .from('contacts')
            .select('id', { count: 'exact', head: true })
            .eq('workspace_id', workspaceId)
            .gte(metricSource.dateField, goal.period_start)
            .lte(metricSource.dateField, goal.period_end + 'T23:59:59');
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
            .gte(metricSource.dateField, goal.period_start)
            .lte(metricSource.dateField, goal.period_end + 'T23:59:59');
          if (error) throw error;
          count = c || 0;
          break;
        }
        case 'calendar_events': {
          const { count: c, error } = await supabase
            .from('calendar_events')
            .select('id', { count: 'exact', head: true })
            .eq('workspace_id', workspaceId)
            .gte(metricSource.dateField, goal.period_start)
            .lte(metricSource.dateField, goal.period_end + 'T23:59:59');
          if (error) throw error;
          count = c || 0;
          break;
        }
        case 'proposals': {
          const { count: c, error } = await supabase
            .from('proposals')
            .select('id', { count: 'exact', head: true })
            .eq('workspace_id', workspaceId)
            .gte(metricSource.dateField, goal.period_start)
            .lte(metricSource.dateField, goal.period_end + 'T23:59:59');
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
