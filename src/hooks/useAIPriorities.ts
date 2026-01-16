import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { toast } from 'sonner';

export interface AIPriority {
  id: string;
  type: 'follow_up' | 'meeting_prep' | 'message' | 'call' | 'close_deal' | 'task' | 'review' | 'alert';
  title: string;
  description: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  entityId?: string;
  entityType?: 'lead' | 'contact' | 'opportunity' | 'company' | 'ticket';
  actionRoute?: string;
  status: 'pending' | 'completed' | 'deferred' | 'ignored';
}

export interface AIInsights {
  greeting: string;
  daySummary: string;
  priorities: AIPriority[];
  coachTip?: string;
  motivationalNote?: string;
}

interface MeetingData {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  contact_name?: string;
  company_name?: string;
}

interface OpportunityData {
  id: string;
  title: string;
  value: number;
  stage: string;
  days_inactive: number;
  probability: number;
  contact_name?: string;
  company_name?: string;
}

interface PerformanceData {
  weekly_target: number;
  weekly_current: number;
  monthly_target: number;
  monthly_current: number;
  deals_to_close: number;
}

export function useAIPriorities() {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const [isLoading, setIsLoading] = useState(false);
  const [insights, setInsights] = useState<AIInsights | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchAIPriorities = useCallback(async (
    role: 'comercial' | 'gestor' | 'suporte' | 'admin',
    meetings: MeetingData[],
    opportunities: OpportunityData[],
    performance: PerformanceData,
    stats: {
      pendingFollowups: number;
      overdueFollowups: number;
      unreadConversations: number;
    }
  ) => {
    if (!user || !currentWorkspace) return null;

    setIsLoading(true);
    setError(null);

    try {
      const userName = user.user_metadata?.full_name?.split(' ')[0] || 'Utilizador';
      const currentHour = new Date().getHours();

      const { data, error: fnError } = await supabase.functions.invoke('ai-member-priorities', {
        body: {
          userName,
          role,
          meetings,
          opportunities,
          performance,
          pendingFollowups: stats.pendingFollowups,
          overdueFollowups: stats.overdueFollowups,
          unreadConversations: stats.unreadConversations,
          currentHour,
        },
      });

      if (fnError) {
        throw fnError;
      }

      if (data?.error) {
        if (data.error.includes('Rate limit')) {
          toast.error('Limite de pedidos excedido. Tenta novamente em alguns segundos.');
        } else if (data.error.includes('Payment required')) {
          toast.error('Créditos insuficientes. Adiciona créditos para continuar.');
        }
        throw new Error(data.error);
      }

      const aiInsights: AIInsights = {
        greeting: data.greeting || `Olá, ${userName}!`,
        daySummary: data.daySummary || 'A carregar resumo do dia...',
        priorities: (data.priorities || []).map((p: any) => ({
          ...p,
          status: 'pending' as const,
        })),
        coachTip: data.coachTip,
        motivationalNote: data.motivationalNote,
      };

      setInsights(aiInsights);
      return aiInsights;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao obter prioridades';
      setError(message);
      console.error('AI Priorities error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user, currentWorkspace]);

  const updatePriorityStatus = useCallback((id: string, status: AIPriority['status']) => {
    setInsights(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        priorities: prev.priorities.map(p => 
          p.id === id ? { ...p, status } : p
        ),
      };
    });
  }, []);

  const clearInsights = useCallback(() => {
    setInsights(null);
    setError(null);
  }, []);

  return {
    isLoading,
    insights,
    error,
    fetchAIPriorities,
    updatePriorityStatus,
    clearInsights,
  };
}
