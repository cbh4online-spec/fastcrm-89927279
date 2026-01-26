import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { ProductivityGoal } from './useProductivityCoach';
import { format, eachDayOfInterval, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, isAfter, startOfDay } from 'date-fns';

/**
 * Dados de progresso histórico por dia
 */
export interface HistoricalDataPoint {
  date: string;
  value: number;
  cumulative: number;
}

/**
 * Obter intervalo de datas dinâmico para o período
 */
function getDateInterval(goal: ProductivityGoal): { start: Date; end: Date } {
  const now = new Date();
  
  switch (goal.period) {
    case 'daily':
      // Para diário, mostrar últimos 7 dias
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 6);
      return { start: startOfDay(weekAgo), end: startOfDay(now) };
    
    case 'weekly':
      return { 
        start: startOfWeek(now, { weekStartsOn: 1 }), 
        end: endOfWeek(now, { weekStartsOn: 1 }) 
      };
    
    case 'monthly':
      return { start: startOfMonth(now), end: endOfMonth(now) };
    
    case 'quarterly':
      return { start: startOfQuarter(now), end: endOfQuarter(now) };
    
    case 'semiannual': {
      const semesterStart = new Date(now.getFullYear(), now.getMonth() < 6 ? 0 : 6, 1);
      const semesterEnd = new Date(semesterStart.getFullYear(), semesterStart.getMonth() + 6, 0);
      return { start: semesterStart, end: semesterEnd };
    }
    
    case 'annual':
      return { start: startOfYear(now), end: endOfYear(now) };
    
    default:
      return { 
        start: parseISO(goal.period_start), 
        end: parseISO(goal.period_end) 
      };
  }
}

/**
 * Determinar fonte de dados baseado na unidade
 */
function getMetricSource(unit: string | null): { table: string; dateField: string; sumField?: string } | null {
  if (!unit) return null;
  
  const lowerUnit = unit.toLowerCase();
  
  // Financial metrics (sum values)
  if (['euros', '€ (euro)', 'faturacao', 'faturação', 'comissoes', 'comissões'].some(u => lowerUnit.includes(u.toLowerCase()) || lowerUnit.includes('€'))) {
    return { table: 'opportunities', dateField: 'updated_at', sumField: 'value' };
  }
  
  // Sales metrics
  if (['vendas', 'contratos'].some(u => lowerUnit.includes(u))) {
    return { table: 'opportunities', dateField: 'updated_at' };
  }
  
  // Business metrics
  if (lowerUnit.includes('negocios') || lowerUnit.includes('negócios')) {
    return { table: 'opportunities', dateField: 'created_at' };
  }
  
  // Relationship metrics
  if (lowerUnit.includes('reunioes') || lowerUnit.includes('reuniões')) {
    return { table: 'calendar_events', dateField: 'start_time' };
  }
  
  if (lowerUnit.includes('contactos')) {
    return { table: 'contacts', dateField: 'created_at' };
  }
  
  if (lowerUnit.includes('leads')) {
    return { table: 'leads', dateField: 'created_at' };
  }
  
  if (lowerUnit.includes('tarefas')) {
    return { table: 'tasks', dateField: 'updated_at' };
  }
  
  if (lowerUnit.includes('propostas')) {
    return { table: 'proposals', dateField: 'created_at' };
  }
  
  return null;
}

/**
 * Buscar dados históricos agrupados por dia
 */
async function fetchHistoricalData(
  goal: ProductivityGoal,
  workspaceId: string,
  interval: { start: Date; end: Date }
): Promise<HistoricalDataPoint[]> {
  const metricSource = getMetricSource(goal.unit);
  if (!metricSource) return [];
  
  const startDate = format(interval.start, 'yyyy-MM-dd');
  const endDate = format(interval.end, 'yyyy-MM-dd');
  
  try {
    // Query base: get records with dates
    let records: { date: string; value: number }[] = [];
    
    if (metricSource.table === 'opportunities') {
      const { data, error } = await supabase
        .from('opportunities')
        .select('updated_at, created_at, value, status')
        .eq('workspace_id', workspaceId)
        .eq('status', 'won')
        .gte(metricSource.dateField, startDate)
        .lte(metricSource.dateField, endDate + 'T23:59:59');
      
      if (error) throw error;
      
      records = (data || []).map(item => {
        const dateValue = metricSource.dateField === 'updated_at' ? item.updated_at : item.created_at;
        return {
          date: format(new Date(dateValue), 'yyyy-MM-dd'),
          value: metricSource.sumField ? (Number(item.value) || 0) : 1,
        };
      });
    } else if (metricSource.table === 'calendar_events') {
      const { data, error } = await supabase
        .from('calendar_events')
        .select('start_time')
        .eq('workspace_id', workspaceId)
        .gte(metricSource.dateField, startDate)
        .lte(metricSource.dateField, endDate + 'T23:59:59');
      
      if (error) throw error;
      
      records = (data || []).map(item => ({
        date: format(new Date(item.start_time), 'yyyy-MM-dd'),
        value: 1,
      }));
    } else if (metricSource.table === 'contacts') {
      const { data, error } = await supabase
        .from('contacts')
        .select('created_at')
        .eq('workspace_id', workspaceId)
        .gte(metricSource.dateField, startDate)
        .lte(metricSource.dateField, endDate + 'T23:59:59');
      
      if (error) throw error;
      
      records = (data || []).map(item => ({
        date: format(new Date(item.created_at), 'yyyy-MM-dd'),
        value: 1,
      }));
    } else if (metricSource.table === 'leads') {
      const { data, error } = await supabase
        .from('leads')
        .select('created_at')
        .eq('workspace_id', workspaceId)
        .gte(metricSource.dateField, startDate)
        .lte(metricSource.dateField, endDate + 'T23:59:59');
      
      if (error) throw error;
      
      records = (data || []).map(item => ({
        date: format(new Date(item.created_at), 'yyyy-MM-dd'),
        value: 1,
      }));
    } else if (metricSource.table === 'tasks') {
      const { data, error } = await supabase
        .from('tasks')
        .select('updated_at')
        .eq('workspace_id', workspaceId)
        .eq('status', 'done')
        .gte(metricSource.dateField, startDate)
        .lte(metricSource.dateField, endDate + 'T23:59:59');
      
      if (error) throw error;
      
      records = (data || []).map(item => ({
        date: format(new Date(item.updated_at), 'yyyy-MM-dd'),
        value: 1,
      }));
    } else if (metricSource.table === 'proposals') {
      const { data, error } = await supabase
        .from('proposals')
        .select('created_at')
        .eq('workspace_id', workspaceId)
        .gte(metricSource.dateField, startDate)
        .lte(metricSource.dateField, endDate + 'T23:59:59');
      
      if (error) throw error;
      
      records = (data || []).map(item => ({
        date: format(new Date(item.created_at), 'yyyy-MM-dd'),
        value: 1,
      }));
    }
    
    // Agregar por dia
    const dailyTotals: Record<string, number> = {};
    records.forEach(record => {
      dailyTotals[record.date] = (dailyTotals[record.date] || 0) + record.value;
    });
    
    // Criar array com todos os dias do intervalo
    const today = startOfDay(new Date());
    const days = eachDayOfInterval({ start: interval.start, end: interval.end })
      .filter(day => !isAfter(day, today)); // Só incluir dias até hoje
    
    let cumulative = 0;
    const result: HistoricalDataPoint[] = days.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const dayValue = dailyTotals[dateStr] || 0;
      cumulative += dayValue;
      
      return {
        date: dateStr,
        value: dayValue,
        cumulative,
      };
    });
    
    return result;
  } catch (error) {
    console.error('Error fetching historical data:', error);
    return [];
  }
}

/**
 * Hook para obter dados históricos de progresso de uma meta
 */
export function useGoalHistoricalProgress(goal: ProductivityGoal | null) {
  const { currentWorkspace } = useWorkspace();
  
  return useQuery({
    queryKey: ['goal-historical-progress', currentWorkspace?.id, goal?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id || !goal) {
        return [];
      }
      
      const interval = getDateInterval(goal);
      return fetchHistoricalData(goal, currentWorkspace.id, interval);
    },
    enabled: !!currentWorkspace?.id && !!goal && !!getMetricSource(goal.unit),
    staleTime: 60000,
    refetchInterval: 300000,
  });
}

/**
 * Hook para obter dados históricos de múltiplas metas
 */
export function useGoalsHistoricalProgress(goals: ProductivityGoal[]) {
  const { currentWorkspace } = useWorkspace();
  
  return useQuery({
    queryKey: ['goals-historical-progress-batch', currentWorkspace?.id, goals.map(g => g.id).join(',')],
    queryFn: async () => {
      if (!currentWorkspace?.id || goals.length === 0) {
        return {};
      }
      
      const historyMap: Record<string, HistoricalDataPoint[]> = {};
      
      await Promise.all(
        goals.map(async (goal) => {
          if (getMetricSource(goal.unit)) {
            const interval = getDateInterval(goal);
            const data = await fetchHistoricalData(goal, currentWorkspace.id, interval);
            if (data.length > 0) {
              historyMap[goal.id] = data;
            }
          }
        })
      );
      
      return historyMap;
    },
    enabled: !!currentWorkspace?.id && goals.length > 0,
    staleTime: 60000,
    refetchInterval: 300000,
  });
}

/**
 * Verifica se uma unidade suporta dados históricos
 */
export function supportsHistoricalData(unit: string | null): boolean {
  return !!getMetricSource(unit);
}
