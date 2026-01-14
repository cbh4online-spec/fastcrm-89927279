import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import { CrmBlueprint } from '@/types/blueprint';
import { ApplyMode } from '@/components/blueprint/BlueprintApplyPreview';
import { useCustomFields, useCreateCustomField, CustomField, CustomFieldType } from '@/hooks/useCustomFields';
import { usePipelineStages } from '@/hooks/usePipelineStages';
import { toast } from 'sonner';
import {
  detectFieldDuplicates,
  detectAutomationDuplicates,
  detectStageDuplicates,
  DuplicateMatch,
} from '@/lib/duplicateDetection';
import { Json } from '@/integrations/supabase/types';
import { BlueprintCustomField } from '@/types/blueprint';

// Map blueprint field types to supported CustomFieldType
function mapBlueprintTypeToCustomFieldType(blueprintType: BlueprintCustomField['type']): CustomFieldType {
  const typeMapping: Record<BlueprintCustomField['type'], CustomFieldType> = {
    'text': 'text',
    'textarea': 'text',
    'number': 'number',
    'currency': 'number',
    'date': 'date',
    'datetime': 'date',
    'boolean': 'boolean',
    'select': 'select',
    'multiselect': 'select',
    'email': 'text',
    'phone': 'text',
    'url': 'text',
  };
  return typeMapping[blueprintType] || 'text';
}

export interface ApplyResult {
  success: boolean;
  fieldsCreated: number;
  stagesCreated: number;
  automationsCreated: number;
  duplicatesMerged: number;
  duplicatesSkipped: number;
  errors: string[];
}

export function useBlueprintApply(blueprint: CrmBlueprint | null) {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const { data: existingFields = [] } = useCustomFields(blueprint?.entityType as any);
  const { data: existingStagesData = [] } = usePipelineStages();
  const createCustomField = useCreateCustomField();

  const [isApplying, setIsApplying] = useState(false);
  const [existingAutomations, setExistingAutomations] = useState<{ id: string; name: string }[]>([]);
  const [duplicates, setDuplicates] = useState<{
    fields: DuplicateMatch[];
    automations: DuplicateMatch[];
    stages: DuplicateMatch[];
  }>({ fields: [], automations: [], stages: [] });

  // Fetch existing automations
  useEffect(() => {
    const fetchAutomations = async () => {
      if (!currentWorkspace) return;
      
      const { data } = await supabase
        .from('automation_rules')
        .select('id, name')
        .eq('workspace_id', currentWorkspace.id);
      
      setExistingAutomations(data || []);
    };

    fetchAutomations();
  }, [currentWorkspace]);

  // Detect duplicates when blueprint or existing data changes
  useEffect(() => {
    if (!blueprint) return;

    const fieldDups = detectFieldDuplicates(blueprint.customFields, existingFields);
    const stageDups = blueprint.pipelineStages
      ? detectStageDuplicates(
          blueprint.pipelineStages.map(s => ({ name: s.name })),
          existingStagesData.map(s => ({ id: s.id, name: s.name }))
        )
      : [];
    const autoDups = detectAutomationDuplicates(blueprint.automations, existingAutomations);

    setDuplicates({
      fields: fieldDups,
      automations: autoDups,
      stages: stageDups,
    });
  }, [blueprint, existingFields, existingStagesData, existingAutomations]);

  const applyBlueprint = async (
    mode: ApplyMode,
    mergeDecisions: Record<string, 'create' | 'merge' | 'skip'>
  ): Promise<ApplyResult> => {
    if (!blueprint || !currentWorkspace || !user) {
      return { success: false, fieldsCreated: 0, stagesCreated: 0, automationsCreated: 0, duplicatesMerged: 0, duplicatesSkipped: 0, errors: ['Missing data'] };
    }

    setIsApplying(true);
    const result: ApplyResult = {
      success: true,
      fieldsCreated: 0,
      stagesCreated: 0,
      automationsCreated: 0,
      duplicatesMerged: 0,
      duplicatesSkipped: 0,
      errors: [],
    };

    const changesApplied: any[] = [];
    const duplicatesDetected: any[] = duplicates.fields.map(d => ({
      type: 'field',
      name: (d.blueprintItem as any).name,
      similarity: d.similarity,
    }));

    try {
      // Apply fields
      if (mode === 'all' || mode === 'fields') {
        for (const field of blueprint.customFields) {
          const duplicate = duplicates.fields.find(d => 
            (d.blueprintItem as any).name === field.name
          );
          const decision = mergeDecisions[field.name] || 'create';

          if (duplicate) {
            if (decision === 'skip') {
              result.duplicatesSkipped++;
              continue;
            }
            if (decision === 'merge') {
              result.duplicatesMerged++;
              continue;
            }
          }

          try {
            // Convert options to string array format expected by the hook
            const optionsAsStrings = field.options?.map(opt => opt.value) || [];
            
            await createCustomField.mutateAsync({
              entity_type: blueprint.entityType as any,
              name: field.name,
              field_type: mapBlueprintTypeToCustomFieldType(field.type),
              required: field.required,
              options: optionsAsStrings,
            });
            result.fieldsCreated++;
            changesApplied.push({ type: 'field_created', name: field.name, fieldType: field.type });
          } catch (err: any) {
            result.errors.push(`Field "${field.name}": ${err.message}`);
          }
        }
      }

      // Apply pipeline stages
      if ((mode === 'all' || mode === 'stages') && blueprint.pipelineStages) {
        for (const stage of blueprint.pipelineStages) {
          const duplicate = duplicates.stages.find(d => 
            (d.blueprintItem as any).name === stage.name
          );

          if (duplicate) continue; // Skip existing stages

          try {
            const { error } = await supabase.from('pipeline_stages').insert({
              workspace_id: currentWorkspace.id,
              name: stage.name,
              color: stage.color,
              position: stage.position,
            });

            if (error) throw error;
            result.stagesCreated++;
            changesApplied.push({ type: 'stage_created', name: stage.name });
          } catch (err: any) {
            result.errors.push(`Stage "${stage.name}": ${err.message}`);
          }
        }
      }

      // Apply automations
      if (mode === 'all' || mode === 'automations') {
        for (const automation of blueprint.automations) {
          const duplicate = duplicates.automations.find(d => 
            (d.blueprintItem as any).name === automation.name
          );

          if (duplicate) continue; // Skip similar automations

          try {
            const { data: rule, error: ruleError } = await supabase
              .from('automation_rules')
              .insert({
                workspace_id: currentWorkspace.id,
                name: automation.name,
                description: automation.description,
                trigger: automation.trigger as any,
                created_by: user.id,
                is_active: false, // Start inactive for safety
              })
              .select()
              .single();

            if (ruleError) throw ruleError;

            // Insert conditions
            if (automation.conditions.length > 0) {
              const conditions = automation.conditions.map((c, idx) => ({
                rule_id: rule.id,
                field_name: c.field,
                operator: c.operator as any,
                value: c.value,
                position: idx,
              }));

              await supabase.from('automation_conditions').insert(conditions);
            }

            // Insert actions
            if (automation.actions.length > 0) {
              const actions = automation.actions.map((a, idx) => ({
                rule_id: rule.id,
                action_type: a.type as any,
                config: a.config as Json,
                position: idx,
              }));

              await supabase.from('automation_actions').insert(actions);
            }

            result.automationsCreated++;
            changesApplied.push({ type: 'automation_created', name: automation.name });
          } catch (err: any) {
            result.errors.push(`Automation "${automation.name}": ${err.message}`);
          }
        }
      }

      // Create audit log
      await supabase.from('blueprint_apply_logs' as any).insert({
        workspace_id: currentWorkspace.id,
        blueprint_id: blueprint.id,
        applied_by: user.id,
        apply_type: mode,
        changes_applied: changesApplied,
        duplicates_detected: duplicatesDetected,
        duplicates_merged: Object.entries(mergeDecisions)
          .filter(([_, v]) => v === 'merge')
          .map(([k]) => ({ name: k })),
        status: result.errors.length > 0 ? 'partial' : 'completed',
        error_message: result.errors.length > 0 ? result.errors.join('; ') : null,
      } as any);

      if (result.errors.length > 0) {
        toast.warning(`Blueprint aplicado com ${result.errors.length} erro(s)`);
      } else {
        toast.success('Blueprint aplicado com sucesso!');
      }

    } catch (err: any) {
      result.success = false;
      result.errors.push(err.message);
      toast.error('Erro ao aplicar blueprint');
    } finally {
      setIsApplying(false);
    }

    return result;
  };

  return {
    isApplying,
    existingFields,
    existingStages: existingStagesData.map(s => ({ id: s.id, name: s.name, color: s.color })),
    existingAutomations,
    duplicates,
    applyBlueprint,
  };
}
