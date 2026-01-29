import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { toast } from 'sonner';
import {
  ConversationalFlow,
  FlowStep,
  FlowVariable,
  FlowStatus,
  mapFlowFromDB,
  mapStepFromDB,
  mapVariableFromDB
} from '@/types/conversational-flows';

export function useConversationalFlows() {
  const [flows, setFlows] = useState<ConversationalFlow[]>([]);
  const [currentFlow, setCurrentFlow] = useState<ConversationalFlow | null>(null);
  const [steps, setSteps] = useState<FlowStep[]>([]);
  const [variables, setVariables] = useState<FlowVariable[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const workspaceContext = useWorkspace();
  const currentWorkspace = workspaceContext?.currentWorkspace;

  // Load all flows for workspace
  const loadFlows = useCallback(async () => {
    if (!currentWorkspace?.id) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('conversational_flows')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFlows((data || []).map(mapFlowFromDB));
    } catch (err) {
      console.error('Error loading flows:', err);
      toast.error('Erro ao carregar fluxos');
    } finally {
      setIsLoading(false);
    }
  }, [currentWorkspace?.id]);

  // Load flow details (steps + variables)
  const loadFlowDetails = useCallback(async (flowId: string) => {
    setIsLoading(true);
    try {
      const [flowRes, stepsRes, varsRes] = await Promise.all([
        supabase.from('conversational_flows').select('*').eq('id', flowId).single(),
        supabase.from('flow_steps').select('*').eq('flow_id', flowId).order('position'),
        supabase.from('flow_variables').select('*').eq('flow_id', flowId).order('position')
      ]);

      if (flowRes.error) throw flowRes.error;
      
      setCurrentFlow(mapFlowFromDB(flowRes.data));
      setSteps((stepsRes.data || []).map(mapStepFromDB));
      setVariables((varsRes.data || []).map(mapVariableFromDB));
    } catch (err) {
      console.error('Error loading flow details:', err);
      toast.error('Erro ao carregar detalhes do fluxo');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Create new flow
  const createFlow = useCallback(async (data: {
    name: string;
    description?: string;
    goalType?: string;
    personaId?: string;
    knowledgeBaseIds?: string[];
    triggerChannels?: string[];
  }) => {
    if (!currentWorkspace?.id) return null;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Utilizador não autenticado');
      return null;
    }

    setIsSaving(true);
    try {
      const { data: flow, error } = await supabase
        .from('conversational_flows')
        .insert({
          workspace_id: currentWorkspace.id,
          name: data.name,
          description: data.description,
          goal_type: data.goalType,
          persona_id: data.personaId,
          knowledge_base_ids: data.knowledgeBaseIds,
          trigger_channels: data.triggerChannels,
          created_by: user.id
        })
        .select()
        .single();

      if (error) throw error;

      const mappedFlow = mapFlowFromDB(flow);
      setFlows(prev => [mappedFlow, ...prev]);
      toast.success('Fluxo criado com sucesso');
      return mappedFlow;
    } catch (err) {
      console.error('Error creating flow:', err);
      toast.error('Erro ao criar fluxo');
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [currentWorkspace?.id]);

  // Update flow
  const updateFlow = useCallback(async (flowId: string, data: Partial<ConversationalFlow>) => {
    setIsSaving(true);
    try {
      const updateData: Record<string, unknown> = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.goalType !== undefined) updateData.goal_type = data.goalType;
      if (data.goalDescription !== undefined) updateData.goal_description = data.goalDescription;
      if (data.successMessage !== undefined) updateData.success_message = data.successMessage;
      if (data.triggerKeywords !== undefined) updateData.trigger_keywords = data.triggerKeywords;
      if (data.triggerChannels !== undefined) updateData.trigger_channels = data.triggerChannels;
      if (data.personaId !== undefined) updateData.persona_id = data.personaId;
      if (data.knowledgeBaseIds !== undefined) updateData.knowledge_base_ids = data.knowledgeBaseIds;
      if (data.fallbackBehavior !== undefined) updateData.fallback_behavior = data.fallbackBehavior;
      if (data.maxRetries !== undefined) updateData.max_retries = data.maxRetries;
      if (data.isDefault !== undefined) updateData.is_default = data.isDefault;
      if (data.priority !== undefined) updateData.priority = data.priority;
      if (data.timeoutMinutes !== undefined) updateData.timeout_minutes = data.timeoutMinutes;

      const { data: updated, error } = await supabase
        .from('conversational_flows')
        .update(updateData)
        .eq('id', flowId)
        .select()
        .single();

      if (error) throw error;

      const mappedFlow = mapFlowFromDB(updated);
      setFlows(prev => prev.map(f => f.id === flowId ? mappedFlow : f));
      if (currentFlow?.id === flowId) setCurrentFlow(mappedFlow);
      
      return mappedFlow;
    } catch (err) {
      console.error('Error updating flow:', err);
      toast.error('Erro ao atualizar fluxo');
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [currentFlow?.id]);

  // Delete flow
  const deleteFlow = useCallback(async (flowId: string) => {
    try {
      // Delete steps and variables first (cascade should handle, but be safe)
      await supabase.from('flow_steps').delete().eq('flow_id', flowId);
      await supabase.from('flow_variables').delete().eq('flow_id', flowId);
      
      const { error } = await supabase
        .from('conversational_flows')
        .delete()
        .eq('id', flowId);

      if (error) throw error;

      setFlows(prev => prev.filter(f => f.id !== flowId));
      if (currentFlow?.id === flowId) {
        setCurrentFlow(null);
        setSteps([]);
        setVariables([]);
      }
      toast.success('Fluxo eliminado');
      return true;
    } catch (err) {
      console.error('Error deleting flow:', err);
      toast.error('Erro ao eliminar fluxo');
      return false;
    }
  }, [currentFlow?.id]);

  // =========== STEPS ===========

  // Create step
  const createStep = useCallback(async (data: Partial<FlowStep> & { flowId: string }) => {
    setIsSaving(true);
    try {
      const insertData = {
        flow_id: data.flowId,
        step_type: data.stepType || 'message',
        name: data.name || 'Novo Passo',
        message_content: data.messageContent,
        message_variants: data.messageVariants,
        variable_id: data.variableId,
        quick_replies: data.quickReplies,
        condition_field: data.conditionField,
        condition_operator: data.conditionOperator,
        condition_value: data.conditionValue,
        action_type: data.actionType,
        action_config: data.actionConfig,
        goal_name: data.goalName,
        conversion_value: data.conversionValue,
        next_step_id: data.nextStepId,
        condition_true_step_id: data.conditionTrueStepId,
        condition_false_step_id: data.conditionFalseStepId,
        position_x: data.positionX || 0,
        position_y: data.positionY || 0,
        is_entry_point: data.isEntryPoint || false,
        position: data.position || steps.length
      };

      // Use generic query since types may not be updated yet
      const { data: step, error } = await supabase
        .from('flow_steps' as 'flow_steps')
        .insert(insertData as never)
        .select()
        .single();

      if (error) throw error;

      const mappedStep = mapStepFromDB(step as Record<string, unknown>);
      setSteps(prev => [...prev, mappedStep]);
      return mappedStep;
    } catch (err) {
      console.error('Error creating step:', err);
      toast.error('Erro ao criar passo');
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [steps.length]);

  // Update step
  const updateStep = useCallback(async (stepId: string, data: Partial<FlowStep>) => {
    setIsSaving(true);
    try {
      const updateData: Record<string, unknown> = {};
      if (data.stepType !== undefined) updateData.step_type = data.stepType;
      if (data.name !== undefined) updateData.name = data.name;
      if (data.messageContent !== undefined) updateData.message_content = data.messageContent;
      if (data.messageVariants !== undefined) updateData.message_variants = data.messageVariants;
      if (data.variableId !== undefined) updateData.variable_id = data.variableId;
      if (data.quickReplies !== undefined) updateData.quick_replies = data.quickReplies;
      if (data.conditionField !== undefined) updateData.condition_field = data.conditionField;
      if (data.conditionOperator !== undefined) updateData.condition_operator = data.conditionOperator;
      if (data.conditionValue !== undefined) updateData.condition_value = data.conditionValue;
      if (data.actionType !== undefined) updateData.action_type = data.actionType;
      if (data.actionConfig !== undefined) updateData.action_config = data.actionConfig;
      if (data.goalName !== undefined) updateData.goal_name = data.goalName;
      if (data.conversionValue !== undefined) updateData.conversion_value = data.conversionValue;
      if (data.nextStepId !== undefined) updateData.next_step_id = data.nextStepId;
      if (data.conditionTrueStepId !== undefined) updateData.condition_true_step_id = data.conditionTrueStepId;
      if (data.conditionFalseStepId !== undefined) updateData.condition_false_step_id = data.conditionFalseStepId;
      if (data.positionX !== undefined) updateData.position_x = data.positionX;
      if (data.positionY !== undefined) updateData.position_y = data.positionY;
      if (data.isEntryPoint !== undefined) updateData.is_entry_point = data.isEntryPoint;
      if (data.position !== undefined) updateData.position = data.position;

      const { data: updated, error } = await supabase
        .from('flow_steps')
        .update(updateData)
        .eq('id', stepId)
        .select()
        .single();

      if (error) throw error;

      const mappedStep = mapStepFromDB(updated);
      setSteps(prev => prev.map(s => s.id === stepId ? mappedStep : s));
      return mappedStep;
    } catch (err) {
      console.error('Error updating step:', err);
      toast.error('Erro ao atualizar passo');
      return null;
    } finally {
      setIsSaving(false);
    }
  }, []);

  // Delete step
  const deleteStep = useCallback(async (stepId: string) => {
    try {
      // Clear references to this step
      await supabase
        .from('flow_steps')
        .update({ next_step_id: null })
        .eq('next_step_id', stepId);
      await supabase
        .from('flow_steps')
        .update({ condition_true_step_id: null })
        .eq('condition_true_step_id', stepId);
      await supabase
        .from('flow_steps')
        .update({ condition_false_step_id: null })
        .eq('condition_false_step_id', stepId);

      const { error } = await supabase
        .from('flow_steps')
        .delete()
        .eq('id', stepId);

      if (error) throw error;

      setSteps(prev => prev.filter(s => s.id !== stepId));
      return true;
    } catch (err) {
      console.error('Error deleting step:', err);
      toast.error('Erro ao eliminar passo');
      return false;
    }
  }, []);

  // Bulk update step positions (for drag & drop)
  const updateStepPositions = useCallback(async (updates: Array<{ id: string; positionX: number; positionY: number }>) => {
    try {
      await Promise.all(
        updates.map(({ id, positionX, positionY }) =>
          supabase
            .from('flow_steps')
            .update({ position_x: positionX, position_y: positionY })
            .eq('id', id)
        )
      );
      
      setSteps(prev => prev.map(s => {
        const update = updates.find(u => u.id === s.id);
        return update ? { ...s, positionX: update.positionX, positionY: update.positionY } : s;
      }));
    } catch (err) {
      console.error('Error updating positions:', err);
    }
  }, []);

  // =========== VARIABLES ===========

  // Create variable
  const createVariable = useCallback(async (data: Partial<FlowVariable> & { flowId: string }) => {
    try {
      const { data: variable, error } = await supabase
        .from('flow_variables')
        .insert({
          flow_id: data.flowId,
          name: data.name || 'nova_variavel',
          display_name: data.displayName || 'Nova Variável',
          variable_type: data.variableType || 'text',
          is_required: data.isRequired || false,
          validation_pattern: data.validationPattern,
          validation_message: data.validationMessage,
          choices: data.choices,
          map_to_field: data.mapToField,
          default_value: data.defaultValue,
          position: data.position || variables.length
        })
        .select()
        .single();

      if (error) throw error;

      const mapped = mapVariableFromDB(variable);
      setVariables(prev => [...prev, mapped]);
      return mapped;
    } catch (err) {
      console.error('Error creating variable:', err);
      toast.error('Erro ao criar variável');
      return null;
    }
  }, [variables.length]);

  // Update variable
  const updateVariable = useCallback(async (varId: string, data: Partial<FlowVariable>) => {
    try {
      const updateData: Record<string, unknown> = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.displayName !== undefined) updateData.display_name = data.displayName;
      if (data.variableType !== undefined) updateData.variable_type = data.variableType;
      if (data.isRequired !== undefined) updateData.is_required = data.isRequired;
      if (data.validationPattern !== undefined) updateData.validation_pattern = data.validationPattern;
      if (data.validationMessage !== undefined) updateData.validation_message = data.validationMessage;
      if (data.choices !== undefined) updateData.choices = data.choices;
      if (data.mapToField !== undefined) updateData.map_to_field = data.mapToField;
      if (data.defaultValue !== undefined) updateData.default_value = data.defaultValue;
      if (data.position !== undefined) updateData.position = data.position;

      const { data: updated, error } = await supabase
        .from('flow_variables')
        .update(updateData)
        .eq('id', varId)
        .select()
        .single();

      if (error) throw error;

      const mapped = mapVariableFromDB(updated);
      setVariables(prev => prev.map(v => v.id === varId ? mapped : v));
      return mapped;
    } catch (err) {
      console.error('Error updating variable:', err);
      toast.error('Erro ao atualizar variável');
      return null;
    }
  }, []);

  // Delete variable
  const deleteVariable = useCallback(async (varId: string) => {
    try {
      // Clear references in steps
      await supabase
        .from('flow_steps')
        .update({ variable_id: null })
        .eq('variable_id', varId);

      const { error } = await supabase
        .from('flow_variables')
        .delete()
        .eq('id', varId);

      if (error) throw error;

      setVariables(prev => prev.filter(v => v.id !== varId));
      return true;
    } catch (err) {
      console.error('Error deleting variable:', err);
      toast.error('Erro ao eliminar variável');
      return false;
    }
  }, []);

  // Activate/Deactivate flow
  const setFlowStatus = useCallback(async (flowId: string, status: FlowStatus) => {
    const updated = await updateFlow(flowId, { status });
    if (updated) {
      toast.success(status === 'active' ? 'Fluxo ativado' : 'Fluxo desativado');
    }
    return updated;
  }, [updateFlow]);

  // Load flows on mount
  useEffect(() => {
    loadFlows();
  }, [loadFlows]);

  return {
    // State
    flows,
    currentFlow,
    steps,
    variables,
    isLoading,
    isSaving,
    
    // Flow operations
    loadFlows,
    loadFlowDetails,
    createFlow,
    updateFlow,
    deleteFlow,
    setFlowStatus,
    setCurrentFlow,
    
    // Step operations
    createStep,
    updateStep,
    deleteStep,
    updateStepPositions,
    
    // Variable operations
    createVariable,
    updateVariable,
    deleteVariable
  };
}
