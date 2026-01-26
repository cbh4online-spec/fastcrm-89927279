/**
 * Hook for triggering and managing workflow executions
 * 
 * Usage:
 * const { triggerWorkflow, isExecuting } = useWorkflowExecution();
 * await triggerWorkflow('lead_qualification_followup', { entityType: 'lead', entityId: leadId });
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { toast } from 'sonner';
import type { WorkflowExecution, TriggerType } from '@/types/workflows';

interface TriggerWorkflowOptions {
  entityType?: string;
  entityId?: string;
  recommendationId?: string;
  inputData?: Record<string, unknown>;
  triggerType?: TriggerType;
}

export function useWorkflowExecution() {
  const { currentWorkspace } = useWorkspace();
  const [isExecuting, setIsExecuting] = useState(false);
  const [lastExecution, setLastExecution] = useState<WorkflowExecution | null>(null);

  const triggerWorkflow = useCallback(async (
    workflowCode: string,
    options: TriggerWorkflowOptions = {}
  ): Promise<WorkflowExecution | null> => {
    if (!currentWorkspace?.id) {
      toast.error('Workspace não encontrado');
      return null;
    }

    setIsExecuting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Call edge function to create and queue workflow
      const { data, error } = await supabase.functions.invoke('workflow-trigger', {
        body: {
          workspaceId: currentWorkspace.id,
          workflowCode,
          triggerType: options.triggerType || 'manual',
          triggerSource: 'user',
          recommendationId: options.recommendationId,
          entityType: options.entityType,
          entityId: options.entityId,
          initiatedBy: user?.id,
          inputData: options.inputData || {},
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      const execution = data as WorkflowExecution;
      setLastExecution(execution);

      toast.success('Workflow iniciado', {
        description: `Execução ${execution.id.slice(0, 8)} em progresso`,
      });

      return execution;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      toast.error('Erro ao iniciar workflow', {
        description: error.message,
      });
      return null;
    } finally {
      setIsExecuting(false);
    }
  }, [currentWorkspace?.id]);

  return {
    triggerWorkflow,
    isExecuting,
    lastExecution,
  };
}
