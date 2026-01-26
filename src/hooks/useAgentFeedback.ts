import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { FeedbackType } from "@/types/aiAgents";

interface SubmitFeedbackParams {
  executionId: string;
  feedbackType: FeedbackType;
  feedbackNotes?: string;
  outcome?: string;
}

/**
 * Hook to submit feedback on agent recommendations
 * 
 * Usage:
 * const { submitFeedback, isSubmitting } = useAgentFeedback();
 * 
 * await submitFeedback({
 *   executionId: 'xxx',
 *   feedbackType: 'useful',
 *   feedbackNotes: 'Great recommendation!',
 * });
 */
export function useAgentFeedback() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const workspaceId = currentWorkspace?.id;
  const userId = user?.id;

  const submitMutation = useMutation({
    mutationFn: async (params: SubmitFeedbackParams) => {
      if (!workspaceId || !userId) {
        throw new Error('Workspace e utilizador são obrigatórios');
      }

      const { data, error } = await supabase
        .from('ai_agent_feedback')
        .insert({
          execution_id: params.executionId,
          workspace_id: workspaceId,
          feedback_type: params.feedbackType,
          feedback_notes: params.feedbackNotes || null,
          outcome: params.outcome || null,
          created_by: userId,
        })
        .select()
        .single();

      if (error) throw error;
      
      return data;
    },
    onSuccess: (_, params) => {
      // Show appropriate toast based on feedback type
      const messages: Record<FeedbackType, { title: string; description: string }> = {
        useful: {
          title: 'Obrigado pelo feedback!',
          description: 'A sua opinião ajuda a melhorar as recomendações.',
        },
        not_useful: {
          title: 'Feedback registado',
          description: 'Vamos melhorar as recomendações futuras.',
        },
        action_taken: {
          title: 'Ação registada',
          description: 'Registámos que seguiu a recomendação.',
        },
        action_ignored: {
          title: 'Feedback registado',
          description: 'Entendido. Vamos analisar alternativas.',
        },
      };
      
      const message = messages[params.feedbackType];
      toast.success(message.title, { description: message.description });
      
      // Invalidate queries to refresh feedback counts
      queryClient.invalidateQueries({ queryKey: ['agent-feedback'] });
    },
    onError: (error: Error) => {
      toast.error('Erro ao submeter feedback', {
        description: error.message,
      });
    },
  });

  // Quick feedback methods
  const markAsUseful = (executionId: string, notes?: string) =>
    submitMutation.mutateAsync({
      executionId,
      feedbackType: 'useful',
      feedbackNotes: notes,
    });

  const markAsNotUseful = (executionId: string, notes?: string) =>
    submitMutation.mutateAsync({
      executionId,
      feedbackType: 'not_useful',
      feedbackNotes: notes,
    });

  const markActionTaken = (executionId: string, outcome?: string) =>
    submitMutation.mutateAsync({
      executionId,
      feedbackType: 'action_taken',
      outcome,
    });

  const markActionIgnored = (executionId: string, reason?: string) =>
    submitMutation.mutateAsync({
      executionId,
      feedbackType: 'action_ignored',
      feedbackNotes: reason,
    });

  return {
    submitFeedback: submitMutation.mutateAsync,
    isSubmitting: submitMutation.isPending,
    error: submitMutation.error,
    
    // Quick methods
    markAsUseful,
    markAsNotUseful,
    markActionTaken,
    markActionIgnored,
  };
}

/**
 * Hook to fetch feedback for a specific execution
 */
export function useExecutionFeedback(_executionId: string | undefined) {
  return {
    // This would be a query if we needed to show existing feedback
    // For now, just return empty - we primarily submit feedback
    hasFeedback: false,
  };
}

/**
 * Get feedback type labels in Portuguese
 */
export function getFeedbackTypeLabel(type: FeedbackType): string {
  const labels: Record<FeedbackType, string> = {
    useful: 'Útil',
    not_useful: 'Não útil',
    action_taken: 'Ação executada',
    action_ignored: 'Ação ignorada',
  };
  return labels[type];
}

/**
 * Get feedback type icon name
 */
export function getFeedbackTypeIcon(type: FeedbackType): string {
  const icons: Record<FeedbackType, string> = {
    useful: 'ThumbsUp',
    not_useful: 'ThumbsDown',
    action_taken: 'CheckCircle',
    action_ignored: 'XCircle',
  };
  return icons[type];
}
