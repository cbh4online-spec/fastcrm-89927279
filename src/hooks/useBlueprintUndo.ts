import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface AppliedChange {
  type: 'field_created' | 'stage_created' | 'automation_created';
  name: string;
  id?: string;
  fieldType?: string;
}

interface ApplyLogEntry {
  id: string;
  blueprint_id: string;
  applied_by: string;
  apply_type: string;
  changes_applied: AppliedChange[];
  status: string;
  created_at: string;
  blueprint_name?: string;
}

export interface UndoResult {
  success: boolean;
  fieldsDeleted: number;
  stagesDeleted: number;
  automationsDeleted: number;
  errors: string[];
}

export function useBlueprintUndo() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isUndoing, setIsUndoing] = useState(false);
  const [lastApply, setLastApply] = useState<ApplyLogEntry | null>(null);

  // Fetch the most recent apply log
  const fetchLastApply = useCallback(async () => {
    if (!currentWorkspace) return;

    setIsLoading(true);
    try {
      // Get the most recent successful/partial apply log
      const { data: logs, error } = await supabase
        .from('blueprint_apply_logs')
        .select(`
          id,
          blueprint_id,
          applied_by,
          apply_type,
          changes_applied,
          status,
          created_at
        `)
        .eq('workspace_id', currentWorkspace.id)
        .in('status', ['completed', 'partial'])
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (logs && logs.length > 0) {
        const log = logs[0];
        
        // Get the blueprint name
        const { data: blueprint } = await supabase
          .from('crm_blueprints')
          .select('name')
          .eq('id', log.blueprint_id)
          .single();

        setLastApply({
          ...log,
          changes_applied: (log.changes_applied as unknown as AppliedChange[]) || [],
          blueprint_name: blueprint?.name,
        });
      } else {
        setLastApply(null);
      }
    } catch (err) {
      console.error('Error fetching last apply log:', err);
      setLastApply(null);
    } finally {
      setIsLoading(false);
    }
  }, [currentWorkspace]);

  useEffect(() => {
    fetchLastApply();
  }, [fetchLastApply]);

  const undoLastApply = async (): Promise<UndoResult> => {
    if (!lastApply || !currentWorkspace || !user) {
      return { success: false, fieldsDeleted: 0, stagesDeleted: 0, automationsDeleted: 0, errors: ['Sem dados para reverter'] };
    }

    setIsUndoing(true);
    const result: UndoResult = {
      success: true,
      fieldsDeleted: 0,
      stagesDeleted: 0,
      automationsDeleted: 0,
      errors: [],
    };

    try {
      const changes = lastApply.changes_applied;

      // Undo fields - delete by name
      const fieldsToDelete = changes.filter(c => c.type === 'field_created').map(c => c.name);
      if (fieldsToDelete.length > 0) {
        const { data: fields } = await supabase
          .from('custom_fields')
          .select('id, name')
          .eq('workspace_id', currentWorkspace.id)
          .in('name', fieldsToDelete);

        if (fields && fields.length > 0) {
          const fieldIds = fields.map(f => f.id);
          
          // First delete any values for these fields
          await supabase
            .from('custom_field_values')
            .delete()
            .in('custom_field_id', fieldIds);

          // Then delete the fields
          const { error } = await supabase
            .from('custom_fields')
            .delete()
            .in('id', fieldIds);

          if (error) {
            result.errors.push(`Erro ao apagar campos: ${error.message}`);
          } else {
            result.fieldsDeleted = fields.length;
          }
        }
      }

      // Undo stages - delete by name
      const stagesToDelete = changes.filter(c => c.type === 'stage_created').map(c => c.name);
      if (stagesToDelete.length > 0) {
        const { data: stages } = await supabase
          .from('pipeline_stages')
          .select('id, name')
          .eq('workspace_id', currentWorkspace.id)
          .in('name', stagesToDelete);

        if (stages && stages.length > 0) {
          // Check if any opportunities use these stages
          const stageIds = stages.map(s => s.id);
          const { data: opportunities } = await supabase
            .from('opportunities')
            .select('id')
            .in('stage_id', stageIds)
            .limit(1);

          if (opportunities && opportunities.length > 0) {
            result.errors.push('Algumas etapas têm oportunidades associadas e não podem ser eliminadas');
          } else {
            const { error } = await supabase
              .from('pipeline_stages')
              .delete()
              .in('id', stageIds);

            if (error) {
              result.errors.push(`Erro ao apagar etapas: ${error.message}`);
            } else {
              result.stagesDeleted = stages.length;
            }
          }
        }
      }

      // Undo automations - delete by name
      const automationsToDelete = changes.filter(c => c.type === 'automation_created').map(c => c.name);
      if (automationsToDelete.length > 0) {
        const { data: automations } = await supabase
          .from('automation_rules')
          .select('id, name')
          .eq('workspace_id', currentWorkspace.id)
          .in('name', automationsToDelete);

        if (automations && automations.length > 0) {
          const automationIds = automations.map(a => a.id);

          // Delete conditions first
          await supabase
            .from('automation_conditions')
            .delete()
            .in('rule_id', automationIds);

          // Delete actions
          await supabase
            .from('automation_actions')
            .delete()
            .in('rule_id', automationIds);

          // Delete logs
          await supabase
            .from('automation_logs')
            .delete()
            .in('rule_id', automationIds);

          // Delete the rules
          const { error } = await supabase
            .from('automation_rules')
            .delete()
            .in('id', automationIds);

          if (error) {
            result.errors.push(`Erro ao apagar automações: ${error.message}`);
          } else {
            result.automationsDeleted = automations.length;
          }
        }
      }

      // Update the apply log status to 'undone'
      await supabase
        .from('blueprint_apply_logs')
        .update({ 
          status: 'undone',
          error_message: result.errors.length > 0 ? `Undo com erros: ${result.errors.join('; ')}` : null
        } as any)
        .eq('id', lastApply.id);

      if (result.errors.length > 0) {
        toast.warning(`Reversão parcial: ${result.errors.length} erro(s)`);
      } else {
        toast.success('Última aplicação revertida com sucesso!');
      }

      // Clear last apply and refresh
      setLastApply(null);
      fetchLastApply();

    } catch (err: any) {
      result.success = false;
      result.errors.push(err.message);
      toast.error('Erro ao reverter aplicação');
    } finally {
      setIsUndoing(false);
    }

    return result;
  };

  return {
    lastApply,
    isLoading,
    isUndoing,
    undoLastApply,
    refreshLastApply: fetchLastApply,
  };
}
