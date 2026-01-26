import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Json } from '@/integrations/supabase/types';

export type GoalPeriod = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'semiannual' | 'annual';
export type GoalStatus = 'not_started' | 'in_progress' | 'completed' | 'failed';
export type GoalScope = 'individual' | 'organizational';

export interface ProductivityGoal {
  id: string;
  workspace_id: string;
  user_id: string | null;
  team_id: string | null;
  period: GoalPeriod;
  period_start: string;
  period_end: string;
  title: string;
  description: string | null;
  target_value: number | null;
  current_value: number | null;
  unit: string | null;
  metric_type: string | null;
  status: GoalStatus;
  priority: number;
  parent_goal_id: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  goal_scope: GoalScope;
}

export interface DailyPriority {
  id: string;
  workspace_id: string;
  user_id: string;
  priority_date: string;
  position: number;
  title: string;
  description: string | null;
  is_completed: boolean;
  completed_at: string | null;
  linked_entity_type: string | null;
  linked_entity_id: string | null;
  ai_generated: boolean;
  ai_reasoning: string | null;
  created_at: string;
  updated_at: string;
}

export interface MeetingPreparation {
  id: string;
  workspace_id: string;
  user_id: string;
  meeting_id: string;
  preparation_date: string;
  client_summary: string | null;
  recent_interactions: string | null;
  key_points: string[];
  suggested_agenda: string[];
  warnings: string[];
  ai_generated: boolean;
  created_at: string;
  updated_at: string;
}

export interface AIPrioritySuggestion {
  title: string;
  description: string;
  reasoning: string;
  linked_entity_type: string | null;
  linked_entity_id: string | null;
}

export interface FreeSlotSuggestion {
  date: string;
  start_time: string;
  end_time: string;
  reason: string;
}

export interface GoalProgressAnalysis {
  overall_status: 'on_track' | 'at_risk' | 'behind' | 'ahead';
  summary: string;
  insights: Array<{
    goal_id: string;
    status: string;
    message: string;
    suggestion: string;
  }>;
  motivation: string;
}

export function useProductivityCoach() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch today's priorities
  const prioritiesQuery = useQuery({
    queryKey: ['daily-priorities', currentWorkspace?.id, user?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id || !user?.id) return [];

      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('daily_priorities')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .eq('user_id', user.id)
        .eq('priority_date', today)
        .order('position');

      if (error) throw error;
      return data as DailyPriority[];
    },
    enabled: !!currentWorkspace?.id && !!user?.id,
  });

  // Fetch user's goals (individual + organizational from workspace)
  const goalsQuery = useQuery({
    queryKey: ['productivity-goals', currentWorkspace?.id, user?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id || !user?.id) return [];

      // Fetch individual goals for the user
      const { data: individualGoals, error: individualError } = await supabase
        .from('productivity_goals')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .eq('user_id', user.id)
        .eq('goal_scope', 'individual')
        .order('period')
        .order('priority');

      if (individualError) throw individualError;

      // Fetch organizational goals for the workspace
      const { data: orgGoals, error: orgError } = await supabase
        .from('productivity_goals')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .eq('goal_scope', 'organizational')
        .order('period')
        .order('priority');

      if (orgError) throw orgError;

      // Combine and return all goals
      return [...(individualGoals || []), ...(orgGoals || [])] as ProductivityGoal[];
    },
    enabled: !!currentWorkspace?.id && !!user?.id,
  });

  // Generate AI priorities
  const generatePriorities = useMutation({
    mutationFn: async () => {
      if (!currentWorkspace?.id) throw new Error('No workspace');

      const { data, error } = await supabase.functions.invoke('productivity-coach', {
        body: {
          action: 'generate-daily-priorities',
          workspaceId: currentWorkspace.id,
        },
      });

      if (error) throw error;
      return data as { priorities: AIPrioritySuggestion[] };
    },
    onError: (error) => {
      toast({
        title: 'Erro ao gerar prioridades',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Save priorities
  const savePriorities = useMutation({
    mutationFn: async (priorities: AIPrioritySuggestion[]) => {
      if (!currentWorkspace?.id || !user?.id) throw new Error('Missing context');

      const today = new Date().toISOString().split('T')[0];

      // Delete existing priorities for today
      await supabase
        .from('daily_priorities')
        .delete()
        .eq('workspace_id', currentWorkspace.id)
        .eq('user_id', user.id)
        .eq('priority_date', today);

      // Insert new priorities
      const { data, error } = await supabase
        .from('daily_priorities')
        .insert(
          priorities.slice(0, 3).map((p, index) => ({
            workspace_id: currentWorkspace.id,
            user_id: user.id,
            priority_date: today,
            position: index + 1,
            title: p.title,
            description: p.description,
            ai_generated: true,
            ai_reasoning: p.reasoning,
            linked_entity_type: p.linked_entity_type,
            linked_entity_id: p.linked_entity_id,
          }))
        )
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-priorities'] });
      toast({ title: 'Prioridades guardadas' });
    },
  });

  // Complete priority
  const completePriority = useMutation({
    mutationFn: async ({ id, is_completed }: { id: string; is_completed: boolean }) => {
      const { error } = await supabase
        .from('daily_priorities')
        .update({
          is_completed,
          completed_at: is_completed ? new Date().toISOString() : null,
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-priorities'] });
    },
  });

  // Prepare meeting
  const prepareMeeting = useMutation({
    mutationFn: async (meetingId: string) => {
      if (!currentWorkspace?.id) throw new Error('No workspace');

      const { data, error } = await supabase.functions.invoke('productivity-coach', {
        body: {
          action: 'prepare-meeting',
          workspaceId: currentWorkspace.id,
          data: { meetingId },
        },
      });

      if (error) throw error;
      return data as MeetingPreparation;
    },
    onError: (error) => {
      toast({
        title: 'Erro ao preparar reunião',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Suggest free slots
  const suggestFreeSlots = useMutation({
    mutationFn: async () => {
      if (!currentWorkspace?.id) throw new Error('No workspace');

      const { data, error } = await supabase.functions.invoke('productivity-coach', {
        body: {
          action: 'suggest-free-slots',
          workspaceId: currentWorkspace.id,
        },
      });

      if (error) throw error;
      return data as { slots: FreeSlotSuggestion[] };
    },
  });

  // Analyze goals progress
  const analyzeGoals = useMutation({
    mutationFn: async (period: GoalPeriod) => {
      if (!currentWorkspace?.id) throw new Error('No workspace');

      const { data, error } = await supabase.functions.invoke('productivity-coach', {
        body: {
          action: 'analyze-goals-progress',
          workspaceId: currentWorkspace.id,
          data: { period },
        },
      });

      if (error) throw error;
      return data as GoalProgressAnalysis;
    },
  });

  // Create goal
  const createGoal = useMutation({
    mutationFn: async (goal: Partial<Omit<ProductivityGoal, 'id' | 'workspace_id' | 'user_id' | 'created_at' | 'updated_at'>> & { period: GoalPeriod; period_start: string; period_end: string; title: string; goal_scope?: GoalScope }) => {
      if (!currentWorkspace?.id || !user?.id) throw new Error('Missing context');

      const scope = goal.goal_scope || 'individual';
      
      const { data, error } = await supabase
        .from('productivity_goals')
        .insert({
          workspace_id: currentWorkspace.id,
          user_id: scope === 'organizational' ? null : user.id,
          period: goal.period,
          period_start: goal.period_start,
          period_end: goal.period_end,
          title: goal.title,
          description: goal.description || null,
          target_value: goal.target_value || null,
          current_value: goal.current_value || 0,
          unit: goal.unit || null,
          status: goal.status || 'not_started',
          goal_scope: scope,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productivity-goals'] });
      toast({ title: 'Meta criada' });
    },
  });

  // Update goal
  const updateGoal = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ProductivityGoal> & { id: string }) => {
      const { data, error } = await supabase
        .from('productivity_goals')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productivity-goals'] });
    },
  });

  // Delete goal
  const deleteGoal = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('productivity_goals').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productivity-goals'] });
      toast({ title: 'Meta eliminada' });
    },
  });

  return {
    priorities: prioritiesQuery.data || [],
    prioritiesLoading: prioritiesQuery.isLoading,
    goals: goalsQuery.data || [],
    goalsLoading: goalsQuery.isLoading,
    generatePriorities,
    savePriorities,
    completePriority,
    prepareMeeting,
    suggestFreeSlots,
    analyzeGoals,
    createGoal,
    updateGoal,
    deleteGoal,
  };
}
