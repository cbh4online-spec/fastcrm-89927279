import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { toast } from 'sonner';
import { 
  ALL_AUTOMATION_TEMPLATES, 
  getTemplatesByEntityType,
  calculateTotalTimeSaved 
} from '@/data/entityAutomationTemplates';
import type { Json } from '@/integrations/supabase/types';

export interface EntityAutomationStats {
  activeRules: number;
  inactiveRules: number;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  pendingSuggestions: number;
  timeSavedMinutes: number;
  lastExecutionAt: string | null;
}

export interface EntityAutomationContext {
  entityType: 'lead' | 'contact' | 'company' | 'opportunity';
  entityId: string;
  entityName: string;
  recentActivity: Array<{
    type: string;
    timestamp: string;
    data: Record<string, unknown>;
  }>;
  tags: string[];
  journeyStage?: string;
  score?: number;
}

// Fetch automation rules relevant to a specific entity
export function useEntityAutomationRules(entityType: 'lead' | 'contact' | 'company' | 'opportunity', entityId?: string) {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ['entity-automation-rules', currentWorkspace?.id, entityType, entityId],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];

      // Get all automation rules for this workspace
      const { data: rules, error } = await supabase
        .from('automation_rules')
        .select(`
          *,
          conditions:automation_conditions(*),
          actions:automation_actions(*)
        `)
        .eq('workspace_id', currentWorkspace.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter rules that apply to this entity type
      const filtered = (rules || []).filter(rule => {
        const trigger = rule.trigger?.toLowerCase() || '';
        return trigger.includes(entityType);
      });

      return filtered;
    },
    enabled: !!currentWorkspace?.id
  });
}

// Fetch automation stats for a specific entity
export function useEntityAutomationStats(entityType: 'lead' | 'contact' | 'company' | 'opportunity', entityId?: string) {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ['entity-automation-stats', currentWorkspace?.id, entityType, entityId],
    queryFn: async (): Promise<EntityAutomationStats> => {
      if (!currentWorkspace?.id) {
        return {
          activeRules: 0,
          inactiveRules: 0,
          totalExecutions: 0,
          successfulExecutions: 0,
          failedExecutions: 0,
          pendingSuggestions: 0,
          timeSavedMinutes: 0,
          lastExecutionAt: null
        };
      }

      // Get rules for this entity type
      const { data: rules } = await supabase
        .from('automation_rules')
        .select('id, is_active, trigger')
        .eq('workspace_id', currentWorkspace.id);

      const entityRules = (rules || []).filter(r => 
        r.trigger?.toLowerCase()?.includes(entityType)
      );

      const activeRules = entityRules.filter(r => r.is_active).length;
      const inactiveRules = entityRules.filter(r => !r.is_active).length;

      // Get execution logs
      const { data: logs } = await supabase
        .from('automation_logs')
        .select('id, status, created_at')
        .eq('workspace_id', currentWorkspace.id)
        .in('rule_id', entityRules.map(r => r.id))
        .order('created_at', { ascending: false })
        .limit(100);

      const totalExecutions = logs?.length || 0;
      const successfulExecutions = logs?.filter(l => l.status === 'completed').length || 0;
      const failedExecutions = logs?.filter(l => l.status === 'failed').length || 0;
      const lastExecutionAt = logs?.[0]?.created_at || null;

      // Get pending suggestions
      const { count: pendingSuggestions } = await supabase
        .from('automation_suggestions')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', currentWorkspace.id)
        .eq('status', 'pending')
        .ilike('trigger_type', `%${entityType}%`);

      // Calculate time saved (rough estimate based on templates)
      const templates = getTemplatesByEntityType(entityType);
      const avgTimeSavedPerExecution = templates.reduce((sum, t) => sum + t.estimatedTimeSaved, 0) / (templates.length || 1);
      const timeSavedMinutes = Math.round(successfulExecutions * avgTimeSavedPerExecution * 0.1);

      return {
        activeRules,
        inactiveRules,
        totalExecutions,
        successfulExecutions,
        failedExecutions,
        pendingSuggestions: pendingSuggestions || 0,
        timeSavedMinutes,
        lastExecutionAt
      };
    },
    enabled: !!currentWorkspace?.id
  });
}

// Generate entity-specific automation suggestions
export function useGenerateEntitySuggestions() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      entityType, 
      entityId, 
      context 
    }: { 
      entityType: 'lead' | 'contact' | 'company' | 'opportunity';
      entityId: string;
      context?: EntityAutomationContext;
    }) => {
      if (!currentWorkspace?.id) throw new Error('No workspace');

      const { data, error } = await supabase.functions.invoke('ai-entity-automation-suggestions', {
        body: {
          workspaceId: currentWorkspace.id,
          entityType,
          entityId,
          context
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['entity-automation-stats', currentWorkspace?.id, variables.entityType] 
      });
      queryClient.invalidateQueries({ queryKey: ['automation-suggestions'] });
      toast.success('Sugestões de automação geradas com sucesso!');
    },
    onError: (error: Error) => {
      if (error.message?.includes('429') || error.message?.includes('rate')) {
        toast.error('Limite de pedidos atingido. Tente novamente em alguns minutos.');
      } else if (error.message?.includes('402')) {
        toast.error('Créditos esgotados. Por favor adicione mais créditos.');
      } else {
        toast.error('Erro ao gerar sugestões: ' + error.message);
      }
    }
  });
}

// Install a template automation for an entity
export function useInstallAutomationTemplate() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      templateId, 
      entityType,
      entityId,
      customConfig 
    }: { 
      templateId: string;
      entityType: 'lead' | 'contact' | 'company' | 'opportunity';
      entityId?: string;
      customConfig?: Record<string, unknown>;
    }) => {
      if (!currentWorkspace?.id) throw new Error('No workspace');

      const template = ALL_AUTOMATION_TEMPLATES.find(t => t.id === templateId);
      if (!template) throw new Error('Template not found');

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create the automation rule
      const { data: rule, error: ruleError } = await supabase
        .from('automation_rules')
        .insert({
          workspace_id: currentWorkspace.id,
          created_by: user.id,
          name: template.name,
          description: template.description,
          trigger: template.trigger.type as any,
          trigger_config: { ...template.trigger.config, ...customConfig } as Json,
          is_active: true
        })
        .select()
        .single();

      if (ruleError) throw ruleError;

      // Create conditions
      if (template.conditions.length > 0) {
        const { error: condError } = await supabase
          .from('automation_conditions')
          .insert(
            template.conditions.map((c, idx) => ({
              rule_id: rule.id,
              field_name: c.field_name,
              operator: c.operator as any,
              value: c.value,
              position: idx
            }))
          );
        if (condError) throw condError;
      }

      // Create actions
      if (template.actions.length > 0) {
        const { error: actError } = await supabase
          .from('automation_actions')
          .insert(
            template.actions.map((a, idx) => ({
              rule_id: rule.id,
              action_type: a.action_type as any,
              config: a.config as Json,
              position: idx
            }))
          );
        if (actError) throw actError;
      }

      return rule;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['entity-automation-rules', currentWorkspace?.id, variables.entityType] 
      });
      queryClient.invalidateQueries({ queryKey: ['automation-rules'] });
      toast.success('Template de automação instalado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao instalar template: ' + error.message);
    }
  });
}

// Quick action to create common automations
export function useQuickAutomationAction() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      actionType,
      entityType,
      entityId,
      config
    }: {
      actionType: 'follow_up' | 'reminder' | 'notify' | 'tag' | 'assign';
      entityType: 'lead' | 'contact' | 'company' | 'opportunity';
      entityId: string;
      config: Record<string, unknown>;
    }) => {
      if (!currentWorkspace?.id) throw new Error('No workspace');

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const actionConfigs: Record<string, { name: string; trigger: string; actions: any[] }> = {
        follow_up: {
          name: `Follow-up para ${entityType}`,
          trigger: `${entityType}_updated`,
          actions: [{ action_type: 'create_task', config: { 
            title: config.title || 'Follow-up', 
            due_hours: config.hours || 24 
          }}]
        },
        reminder: {
          name: `Lembrete para ${entityType}`,
          trigger: `${entityType}_updated`,
          actions: [{ action_type: 'notify', config: { 
            message: config.message || 'Lembrete configurado' 
          }}]
        },
        notify: {
          name: `Notificação para ${entityType}`,
          trigger: `${entityType}_updated`,
          actions: [{ action_type: 'notify', config: config }]
        },
        tag: {
          name: `Tag automática para ${entityType}`,
          trigger: `${entityType}_updated`,
          actions: [{ action_type: 'add_tag', config: { tag: config.tag } }]
        },
        assign: {
          name: `Atribuição automática para ${entityType}`,
          trigger: `${entityType}_created`,
          actions: [{ action_type: 'assign_owner', config: config }]
        }
      };

      const actionConfig = actionConfigs[actionType];
      if (!actionConfig) throw new Error('Unknown action type');

      // Create the automation rule
      const { data: rule, error: ruleError } = await supabase
        .from('automation_rules')
        .insert({
          workspace_id: currentWorkspace.id,
          created_by: user.id,
          name: actionConfig.name,
          description: `Ação rápida criada automaticamente`,
          trigger: actionConfig.trigger as any,
          trigger_config: { entity_id: entityId },
          is_active: true
        })
        .select()
        .single();

      if (ruleError) throw ruleError;

      // Create actions
      const { error: actError } = await supabase
        .from('automation_actions')
        .insert(
          actionConfig.actions.map((a: any, idx: number) => ({
            rule_id: rule.id,
            action_type: a.action_type,
            config: a.config,
            position: idx
          }))
        );

      if (actError) throw actError;

      return rule;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['entity-automation-rules', currentWorkspace?.id, variables.entityType] 
      });
      queryClient.invalidateQueries({ queryKey: ['automation-rules'] });
      toast.success('Ação rápida criada com sucesso!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao criar ação: ' + error.message);
    }
  });
}
