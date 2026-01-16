import { supabase } from '@/integrations/supabase/client';
import { 
  JourneyAutomation, 
  JourneyAutomationAction,
  JourneyTriggerType,
  JourneyAutomationLog
} from '@/types/journeyAutomation';
import { Json } from '@/integrations/supabase/types';

interface TriggerContext {
  entityType: 'contact' | 'company';
  entityId: string;
  entityName: string;
  triggerType: JourneyTriggerType;
  triggerData: Record<string, unknown>;
  workspaceId: string;
}

interface ActionResult {
  success: boolean;
  actionType: string;
  error?: string;
}

class JourneyAutomationEngine {
  private static instance: JourneyAutomationEngine;

  static getInstance(): JourneyAutomationEngine {
    if (!JourneyAutomationEngine.instance) {
      JourneyAutomationEngine.instance = new JourneyAutomationEngine();
    }
    return JourneyAutomationEngine.instance;
  }

  /**
   * Evaluate and execute automations for a given trigger
   */
  async processTrigger(context: TriggerContext): Promise<void> {
    try {
      // Fetch active automations for this trigger type
      const { data: automations, error } = await supabase
        .from('journey_automations')
        .select('*')
        .eq('workspace_id', context.workspaceId)
        .eq('trigger_type', context.triggerType)
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching automations:', error);
        return;
      }

      if (!automations || automations.length === 0) {
        return;
      }

      // Process each automation
      for (const automation of automations) {
        await this.executeAutomation(automation as unknown as JourneyAutomation, context);
      }
    } catch (err) {
      console.error('Error processing trigger:', err);
    }
  }

  /**
   * Execute a single automation
   */
  private async executeAutomation(
    automation: JourneyAutomation,
    context: TriggerContext
  ): Promise<void> {
    const actions = automation.actions as JourneyAutomationAction[];
    const results: ActionResult[] = [];

    // Check conditions
    const conditionsMet = await this.evaluateConditions(
      automation.conditions,
      context
    );

    if (!conditionsMet) {
      return;
    }

    // Execute each action
    for (const action of actions) {
      const result = await this.executeAction(action, context);
      results.push(result);
    }

    // Log execution
    await this.logExecution(automation, context, results);
  }

  /**
   * Evaluate automation conditions
   */
  private async evaluateConditions(
    conditions: JourneyAutomation['conditions'],
    context: TriggerContext
  ): Promise<boolean> {
    if (!conditions || conditions.length === 0) {
      return true;
    }

    // For now, simple evaluation - can be extended
    for (const condition of conditions) {
      const value = this.getFieldValue(condition.field, context.triggerData);
      
      switch (condition.operator) {
        case 'equals':
          if (value !== condition.value) return false;
          break;
        case 'not_equals':
          if (value === condition.value) return false;
          break;
        case 'greater_than':
          if (typeof value !== 'number' || value <= (condition.value as number)) return false;
          break;
        case 'less_than':
          if (typeof value !== 'number' || value >= (condition.value as number)) return false;
          break;
        case 'is_empty':
          if (value !== null && value !== undefined && value !== '') return false;
          break;
        case 'is_not_empty':
          if (value === null || value === undefined || value === '') return false;
          break;
      }
    }

    return true;
  }

  /**
   * Get field value from trigger data using dot notation
   */
  private getFieldValue(field: string, data: Record<string, unknown>): unknown {
    const parts = field.split('.');
    let value: unknown = data;
    
    for (const part of parts) {
      if (value && typeof value === 'object' && part in (value as Record<string, unknown>)) {
        value = (value as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }
    
    return value;
  }

  /**
   * Execute a single action
   */
  private async executeAction(
    action: JourneyAutomationAction,
    context: TriggerContext
  ): Promise<ActionResult> {
    try {
      switch (action.type) {
        case 'update_journey_stage':
          await this.updateJourneyStage(action.config, context);
          break;

        case 'create_task':
          await this.createTask(action.config, context);
          break;

        case 'create_ai_suggestion':
          await this.createAISuggestion(action.config, context);
          break;

        case 'update_churn_risk':
          await this.updateChurnRisk(action.config, context);
          break;

        case 'create_note':
          await this.createNote(action.config, context);
          break;

        case 'update_product_status':
          await this.updateProductStatus(action.config, context);
          break;

        default:
          console.warn('Unknown action type:', action.type);
      }

      return { success: true, actionType: action.type };
    } catch (error) {
      console.error('Error executing action:', action.type, error);
      return { 
        success: false, 
        actionType: action.type, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Update journey stage on contact/company
   */
  private async updateJourneyStage(
    config: Record<string, unknown>,
    context: TriggerContext
  ): Promise<void> {
    const table = context.entityType === 'contact' ? 'contacts' : 'companies';
    const newStage = config.newStage as string;

    // Note: We store journey stage in ai_temperature for now (or a custom field)
    // This could be extended to use a dedicated field
    await supabase
      .from(table)
      .update({ ai_temperature: newStage })
      .eq('id', context.entityId);
  }

  /**
   * Create a task for the owner/admin
   */
  private async createTask(
    config: Record<string, unknown>,
    context: TriggerContext
  ): Promise<void> {
    const { data: workspace } = await supabase
      .from('workspace_members')
      .select('user_id')
      .eq('workspace_id', context.workspaceId)
      .eq('role', 'owner')
      .single();

    const assignedTo = workspace?.user_id;
    const dueDays = (config.dueDays as number) || 1;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + dueDays);

    await supabase.from('tasks').insert({
      workspace_id: context.workspaceId,
      title: config.title as string,
      due_at: dueDate.toISOString(),
      assigned_to: assignedTo,
      related_type: context.entityType,
      related_id: context.entityId,
      status: 'todo'
    });
  }

  /**
   * Create an AI suggestion
   */
  private async createAISuggestion(
    config: Record<string, unknown>,
    context: TriggerContext
  ): Promise<void> {
    const suggestionType = config.suggestionType as string;
    const priority = (config.priority as string) || 'medium';

    const suggestionTitles: Record<string, string> = {
      schedule_session: 'Agendar Próxima Sessão',
      upsell: 'Oportunidade de Upsell',
      reactivation: 'Sugestão de Reativação',
      churn_warning: 'Alerta de Risco de Abandono',
      custom: config.customMessage as string || 'Sugestão Automática'
    };

    const suggestionDescriptions: Record<string, string> = {
      schedule_session: `O cliente ${context.entityName} está fora da frequência recomendada de sessões.`,
      upsell: `O cliente ${context.entityName} está pronto para avançar para o próximo nível.`,
      reactivation: `O cliente ${context.entityName} está em pausa e pode ser reativado.`,
      churn_warning: `O cliente ${context.entityName} apresenta risco de abandono.`,
      custom: config.customMessage as string || 'Sugestão gerada automaticamente.'
    };

    await supabase.from('journey_ai_suggestions').insert({
      workspace_id: context.workspaceId,
      entity_type: context.entityType,
      entity_id: context.entityId,
      suggestion_type: suggestionType,
      priority,
      title: suggestionTitles[suggestionType] || suggestionType,
      description: suggestionDescriptions[suggestionType] || '',
      reasoning: `Automação ativada pelo trigger: ${context.triggerType}`,
      suggested_action: this.getSuggestedAction(suggestionType),
      action_type: this.getActionType(suggestionType),
      metadata: context.triggerData as Json,
      status: 'pending'
    });
  }

  private getSuggestedAction(suggestionType: string): string {
    const actions: Record<string, string> = {
      schedule_session: 'Contactar cliente para agendar sessão',
      upsell: 'Apresentar proposta de upgrade',
      reactivation: 'Enviar mensagem de reativação',
      churn_warning: 'Contactar cliente urgentemente'
    };
    return actions[suggestionType] || 'Rever situação do cliente';
  }

  private getActionType(suggestionType: string): string {
    const types: Record<string, string> = {
      schedule_session: 'schedule',
      upsell: 'proposal',
      reactivation: 'email',
      churn_warning: 'call'
    };
    return types[suggestionType] || 'task';
  }

  /**
   * Update churn risk on contact/company
   */
  private async updateChurnRisk(
    config: Record<string, unknown>,
    context: TriggerContext
  ): Promise<void> {
    // Store in ai_insight as a marker for now
    const table = context.entityType === 'contact' ? 'contacts' : 'companies';
    const riskLevel = config.newRisk as string;

    await supabase
      .from(table)
      .update({ 
        ai_insight: `Risco de churn: ${riskLevel}`,
        ai_analyzed_at: new Date().toISOString()
      })
      .eq('id', context.entityId);
  }

  /**
   * Create a note on the entity
   */
  private async createNote(
    config: Record<string, unknown>,
    context: TriggerContext
  ): Promise<void> {
    const content = config.content as string;
    const table = context.entityType === 'contact' ? 'contacts' : 'companies';

    // Get current notes and append
    const { data } = await supabase
      .from(table)
      .select('notes')
      .eq('id', context.entityId)
      .single();

    const existingNotes = data?.notes || '';
    const timestamp = new Date().toLocaleString('pt-PT');
    const newNote = `[${timestamp}] [Automação] ${content}`;
    const updatedNotes = existingNotes ? `${existingNotes}\n\n${newNote}` : newNote;

    await supabase
      .from(table)
      .update({ notes: updatedNotes })
      .eq('id', context.entityId);
  }

  /**
   * Update product status
   */
  private async updateProductStatus(
    config: Record<string, unknown>,
    context: TriggerContext
  ): Promise<void> {
    const productId = context.triggerData.productId as string;
    const newStatus = config.newStatus as string;

    if (productId && newStatus) {
      await supabase
        .from('contact_products')
        .update({ status: newStatus })
        .eq('id', productId);
    }
  }

  /**
   * Log automation execution
   */
  private async logExecution(
    automation: JourneyAutomation,
    context: TriggerContext,
    results: ActionResult[]
  ): Promise<void> {
    const allSuccess = results.every(r => r.success);
    const anySuccess = results.some(r => r.success);
    const status = allSuccess ? 'success' : anySuccess ? 'partial' : 'failed';
    const errors = results.filter(r => !r.success).map(r => r.error).join('; ');

    await supabase.from('journey_automation_logs').insert({
      workspace_id: context.workspaceId,
      automation_id: automation.id,
      automation_name: automation.name,
      entity_type: context.entityType,
      entity_id: context.entityId,
      entity_name: context.entityName,
      trigger_type: context.triggerType,
      trigger_data: context.triggerData as Json,
      actions_executed: results as unknown as Json,
      status,
      error_message: errors || null
    });
  }

  /**
   * Calculate affected clients count for an automation
   */
  async calculateAffectedClients(
    workspaceId: string,
    triggerType: JourneyTriggerType,
    triggerConfig: Record<string, unknown>
  ): Promise<number> {
    // Simplified count - in production this would be more sophisticated
    let count = 0;

    switch (triggerType) {
      case 'product_acquired':
        const { count: productCount } = await supabase
          .from('contact_products')
          .select('*', { count: 'exact', head: true })
          .eq('workspace_id', workspaceId);
        count = productCount || 0;
        break;

      case 'consumption_threshold':
        const threshold = (triggerConfig.percentage as number) || 80;
        const { data: products } = await supabase
          .from('contact_products')
          .select('consumed_quantity, purchased_quantity')
          .eq('workspace_id', workspaceId)
          .not('purchased_quantity', 'is', null);

        count = products?.filter(p => {
          const pct = ((p.consumed_quantity || 0) / (p.purchased_quantity || 1)) * 100;
          return pct >= threshold;
        }).length || 0;
        break;

      case 'days_inactive':
        const days = (triggerConfig.days as number) || 30;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);

        const { count: inactiveCount } = await supabase
          .from('contacts')
          .select('*', { count: 'exact', head: true })
          .eq('workspace_id', workspaceId)
          .lt('last_contact_at', cutoffDate.toISOString());
        count = inactiveCount || 0;
        break;

      default:
        // Default count of active contacts
        const { count: defaultCount } = await supabase
          .from('contacts')
          .select('*', { count: 'exact', head: true })
          .eq('workspace_id', workspaceId);
        count = defaultCount || 0;
    }

    return count;
  }
}

export const journeyAutomationEngine = JourneyAutomationEngine.getInstance();
