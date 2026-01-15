import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useWorkspaceInstance } from '@/contexts/WorkspaceInstanceContext';
import { toast } from 'sonner';
import {
  AIInsight,
  EntityScore,
  InsightsAnalysisResult,
  InsightsSettings,
  InsightCategory,
  InsightActionType,
} from '@/types/aiInsights';

interface UseAIInsightsOptions {
  entityId: string;
  entityType: 'lead' | 'contact' | 'company';
  autoFetch?: boolean;
}

export function useAIInsights({ entityId, entityType, autoFetch = true }: UseAIInsightsOptions) {
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();
  const queryClient = useQueryClient();
  
  const [settings, setSettings] = useState<InsightsSettings>({
    proactivityLevel: 'medium',
    enabledCategories: ['priority', 'risk', 'opportunity', 'efficiency'],
    autoRefresh: false,
    refreshInterval: 5,
  });

  // Fetch entity data
  const entityQuery = useQuery({
    queryKey: ['entity-for-insights', entityType, entityId],
    queryFn: async () => {
      const table = entityType === 'lead' ? 'leads' : entityType === 'contact' ? 'contacts' : 'companies';
      const { data, error } = await workspaceClient
        .from(table)
        .select('*')
        .eq('id', entityId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!entityId && !!currentWorkspace?.id,
  });

  // Fetch conversation data
  const conversationQuery = useQuery({
    queryKey: ['conversations-for-insights', entityType, entityId],
    queryFn: async () => {
      const linkField = entityType === 'lead' ? 'lead_id' : entityType === 'contact' ? 'contact_id' : 'company_id';
      
      const { data: conversations, error } = await workspaceClient
        .from('conversations')
        .select(`
          id,
          last_message_at,
          unread_count,
          messages (
            content,
            direction,
            sent_at,
            channel
          )
        `)
        .eq(linkField, entityId)
        .order('last_message_at', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      
      const allMessages = conversations?.flatMap(c => (c as any).messages || []) || [];
      const lastMessageAt = conversations?.[0]?.last_message_at || null;
      const unreadCount = conversations?.reduce((sum, c) => sum + (c.unread_count || 0), 0) || 0;
      
      return {
        messages: allMessages.slice(0, 20),
        lastMessageAt,
        unreadCount,
      };
    },
    enabled: !!entityId && !!currentWorkspace?.id,
  });

  // Fetch activity data
  const activityQuery = useQuery({
    queryKey: ['activities-for-insights', entityType, entityId],
    queryFn: async () => {
      // Fetch data sequentially to avoid deep type instantiation
      const tasksData = await workspaceClient
        .from('tasks')
        .select('id, status')
        .eq('related_type', entityType)
        .eq('related_id', entityId);
      
      const tasks = tasksData.data || [];
      
      let opportunities: any[] = [];
      if (entityType !== 'company') {
        const oppData = await workspaceClient
          .from('opportunities')
          .select('id, value, status, stage_id')
          .eq(entityType === 'lead' ? 'lead_id' : 'contact_id', entityId);
        opportunities = oppData.data || [];
      }
      
      const proposalsData = await workspaceClient
        .from('proposals')
        .select('id, status');
      const proposals = proposalsData.data || [];
      
      const paymentsData = await workspaceClient
        .from('payments')
        .select('id, amount, status, opportunity_id');
      const payments = paymentsData.data || [];
      
      const opportunityIds = opportunities.map((o) => o.id);
      const relevantPayments = payments.filter((p) => opportunityIds.includes(p.opportunity_id));
      
      return {
        openTasks: tasks.filter((t) => t.status !== 'done').length,
        completedTasks: tasks.filter((t) => t.status === 'done').length,
        opportunities: opportunities.map((o) => ({
          value: o.value || 0,
          status: o.status,
          stage: o.stage_id,
        })),
        proposals: proposals.map((p) => ({
          status: p.status,
          value: 0,
        })),
        payments: relevantPayments.map((p) => ({
          amount: p.amount,
          status: p.status,
        })),
      };
    },
    enabled: !!entityId && !!currentWorkspace?.id,
  });

  // Main insights query
  const insightsQuery = useQuery({
    queryKey: ['ai-insights', entityType, entityId, settings.proactivityLevel],
    queryFn: async (): Promise<InsightsAnalysisResult> => {
      const { data, error } = await supabase.functions.invoke('ai-entity-insights', {
        body: {
          entityId,
          entityType,
          workspaceId: currentWorkspace?.id,
          entityData: entityQuery.data,
          conversationData: conversationQuery.data,
          activityData: activityQuery.data,
          proactivityLevel: settings.proactivityLevel,
        },
      });
      
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      return data;
    },
    enabled: autoFetch && !!entityId && !!currentWorkspace?.id && !!entityQuery.data,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Refresh insights
  const refreshMutation = useMutation({
    mutationFn: async () => {
      // Invalidate and refetch all related queries
      await queryClient.invalidateQueries({ queryKey: ['entity-for-insights', entityType, entityId] });
      await queryClient.invalidateQueries({ queryKey: ['conversations-for-insights', entityType, entityId] });
      await queryClient.invalidateQueries({ queryKey: ['activities-for-insights', entityType, entityId] });
      
      // Wait for data to be fresh
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const { data, error } = await supabase.functions.invoke('ai-entity-insights', {
        body: {
          entityId,
          entityType,
          workspaceId: currentWorkspace?.id,
          entityData: entityQuery.data,
          conversationData: conversationQuery.data,
          activityData: activityQuery.data,
          proactivityLevel: settings.proactivityLevel,
        },
      });
      
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['ai-insights', entityType, entityId, settings.proactivityLevel], data);
      toast.success('Insights atualizados');
    },
    onError: (error) => {
      console.error('Refresh insights error:', error);
      toast.error('Erro ao atualizar insights');
    },
  });

  // Dismiss insight
  const dismissInsight = useCallback((insightId: string) => {
    queryClient.setQueryData<InsightsAnalysisResult | undefined>(
      ['ai-insights', entityType, entityId, settings.proactivityLevel],
      (old) => {
        if (!old) return old;
        return {
          ...old,
          insights: old.insights.map(i => 
            i.id === insightId ? { ...i, dismissed: true } : i
          ),
        };
      }
    );
  }, [queryClient, entityType, entityId, settings.proactivityLevel]);

  // Submit feedback
  const submitFeedback = useCallback((insightId: string, feedback: 'useful' | 'not_useful') => {
    queryClient.setQueryData<InsightsAnalysisResult | undefined>(
      ['ai-insights', entityType, entityId, settings.proactivityLevel],
      (old) => {
        if (!old) return old;
        return {
          ...old,
          insights: old.insights.map(i => 
            i.id === insightId ? { ...i, feedback } : i
          ),
        };
      }
    );
    toast.success('Obrigado pelo feedback!');
  }, [queryClient, entityType, entityId, settings.proactivityLevel]);

  // Update settings
  const updateSettings = useCallback((newSettings: Partial<InsightsSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  // Filter insights by enabled categories
  const filteredInsights = useMemo(() => {
    if (!insightsQuery.data?.insights) return [];
    return insightsQuery.data.insights.filter(
      (insight) => 
        settings.enabledCategories.includes(insight.category) && 
        !insight.dismissed
    );
  }, [insightsQuery.data?.insights, settings.enabledCategories]);

  return {
    // Data
    insights: filteredInsights,
    score: insightsQuery.data?.score || null,
    summary: insightsQuery.data?.summary || null,
    predictedActions: insightsQuery.data?.predictedActions || [],
    analysisTimestamp: insightsQuery.data?.analysisTimestamp || null,
    
    // Entity data (for context)
    entityData: entityQuery.data,
    conversationData: conversationQuery.data,
    activityData: activityQuery.data,
    
    // Loading states
    isLoading: insightsQuery.isLoading || entityQuery.isLoading,
    isRefreshing: refreshMutation.isPending,
    error: insightsQuery.error,
    
    // Actions
    refresh: () => refreshMutation.mutate(),
    dismissInsight,
    submitFeedback,
    
    // Settings
    settings,
    updateSettings,
  };
}

// Separate hook for insights history
export function useInsightsHistory(entityId: string, entityType: 'lead' | 'contact' | 'company') {
  const { currentWorkspace } = useWorkspace();
  
  // For now, return empty - would need a database table to store history
  return {
    history: [],
    isLoading: false,
  };
}
