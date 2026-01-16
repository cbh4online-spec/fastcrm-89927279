export type JourneyTriggerType =
  | 'product_acquired'
  | 'consumption_logged'
  | 'days_since_consumption'
  | 'consumption_threshold'
  | 'product_completed'
  | 'days_inactive'
  | 'journey_stage_changed'
  | 'periodic_analysis';

export type JourneyActionType =
  | 'update_journey_stage'
  | 'create_task'
  | 'create_ai_suggestion'
  | 'update_churn_risk'
  | 'create_note'
  | 'send_notification'
  | 'update_product_status';

export type JourneyStageValue =
  | 'novo'
  | 'em_onboarding'
  | 'em_consumo'
  | 'em_pausa'
  | 'concluido'
  | 'pronto_upsell'
  | 'em_risco';

export interface JourneyAutomationCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'is_empty' | 'is_not_empty';
  value?: string | number | boolean;
}

export interface JourneyAutomationAction {
  type: JourneyActionType;
  config: Record<string, unknown>;
}

export interface JourneyAutomation {
  id: string;
  name: string;
  description: string;
  triggerType: JourneyTriggerType;
  triggerConfig: Record<string, unknown>;
  conditions: JourneyAutomationCondition[];
  actions: JourneyAutomationAction[];
  isActive: boolean;
  affectedClientsCount?: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  workspaceId: string;
}

export interface JourneyAutomationLog {
  id: string;
  automationId: string;
  automationName: string;
  entityType: 'contact' | 'company';
  entityId: string;
  entityName: string;
  triggerType: JourneyTriggerType;
  triggerData: Record<string, unknown>;
  actionsExecuted: JourneyAutomationAction[];
  status: 'success' | 'failed' | 'partial';
  errorMessage?: string;
  executedAt: string;
}

// Trigger configuration types
export interface DaysSinceConsumptionTrigger {
  days: number;
  checkFrequency: 'daily' | 'hourly';
}

export interface ConsumptionThresholdTrigger {
  percentage: number; // e.g., 80 for 80%
}

export interface DaysInactiveTrigger {
  days: number;
  checkFrequency: 'daily' | 'hourly';
}

// Action configuration types
export interface UpdateJourneyStageAction {
  newStage: JourneyStageValue;
}

export interface CreateTaskAction {
  title: string;
  description?: string;
  priority: 'high' | 'medium' | 'low';
  assignTo: 'owner' | 'admin' | 'specific_user';
  specificUserId?: string;
  dueDays?: number;
}

export interface CreateAISuggestionAction {
  suggestionType: 'schedule_session' | 'upsell' | 'reactivation' | 'churn_warning' | 'custom';
  priority: 'high' | 'medium' | 'low';
  customMessage?: string;
}

export interface UpdateChurnRiskAction {
  newRisk: 'baixo' | 'medio' | 'alto';
}

export interface CreateNoteAction {
  content: string;
  noteType: 'system' | 'automation';
}

// Labels and config
export const TRIGGER_TYPE_LABELS: Record<JourneyTriggerType, string> = {
  product_acquired: 'Produto Adquirido',
  consumption_logged: 'Consumo Registado',
  days_since_consumption: 'Dias Desde Último Consumo',
  consumption_threshold: 'Limite de Consumo Atingido',
  product_completed: 'Produto Concluído',
  days_inactive: 'Dias de Inatividade',
  journey_stage_changed: 'Etapa da Jornada Alterada',
  periodic_analysis: 'Análise Periódica'
};

export const ACTION_TYPE_LABELS: Record<JourneyActionType, string> = {
  update_journey_stage: 'Atualizar Etapa da Jornada',
  create_task: 'Criar Tarefa',
  create_ai_suggestion: 'Criar Sugestão IA',
  update_churn_risk: 'Atualizar Risco de Churn',
  create_note: 'Criar Nota',
  send_notification: 'Enviar Notificação',
  update_product_status: 'Atualizar Estado do Produto'
};

export const JOURNEY_STAGE_LABELS: Record<JourneyStageValue, string> = {
  novo: 'Novo',
  em_onboarding: 'Em Onboarding',
  em_consumo: 'Em Consumo',
  em_pausa: 'Em Pausa',
  concluido: 'Concluído',
  pronto_upsell: 'Pronto para Upsell',
  em_risco: 'Em Risco'
};

// Default automations templates
export const DEFAULT_JOURNEY_AUTOMATIONS: Omit<JourneyAutomation, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'workspaceId'>[] = [
  {
    name: 'Início de Jornada',
    description: 'Quando um cliente adquire o primeiro produto, inicia o onboarding',
    triggerType: 'product_acquired',
    triggerConfig: { isFirstProduct: true },
    conditions: [],
    actions: [
      { type: 'update_journey_stage', config: { newStage: 'em_onboarding' } },
      { type: 'create_task', config: { title: 'Contactar cliente para onboarding', priority: 'high', assignTo: 'owner', dueDays: 1 } }
    ],
    isActive: false
  },
  {
    name: 'Acompanhamento de Consumo',
    description: 'Atualiza o estado quando há registo de consumo',
    triggerType: 'consumption_logged',
    triggerConfig: {},
    conditions: [],
    actions: [
      { type: 'update_journey_stage', config: { newStage: 'em_consumo' } }
    ],
    isActive: false
  },
  {
    name: 'Lembrete de Próxima Sessão',
    description: 'Cria tarefa quando cliente está fora da frequência recomendada',
    triggerType: 'days_since_consumption',
    triggerConfig: { days: 14, checkFrequency: 'daily' },
    conditions: [
      { field: 'product.recommended_frequency', operator: 'is_not_empty' }
    ],
    actions: [
      { type: 'create_task', config: { title: 'Agendar próxima sessão', priority: 'medium', assignTo: 'owner', dueDays: 2 } },
      { type: 'create_ai_suggestion', config: { suggestionType: 'schedule_session', priority: 'medium' } }
    ],
    isActive: false
  },
  {
    name: 'Alerta de Consumo a Terminar',
    description: 'Alerta quando consumo atinge 80% do total',
    triggerType: 'consumption_threshold',
    triggerConfig: { percentage: 80 },
    conditions: [],
    actions: [
      { type: 'create_task', config: { title: 'Preparar proposta de continuação', priority: 'high', assignTo: 'owner', dueDays: 7 } },
      { type: 'update_journey_stage', config: { newStage: 'pronto_upsell' } },
      { type: 'create_ai_suggestion', config: { suggestionType: 'upsell', priority: 'high' } }
    ],
    isActive: false
  },
  {
    name: 'Conclusão de Produto',
    description: 'Atualiza estado quando produto é concluído',
    triggerType: 'product_completed',
    triggerConfig: {},
    conditions: [],
    actions: [
      { type: 'update_journey_stage', config: { newStage: 'concluido' } },
      { type: 'create_note', config: { content: 'Produto concluído com sucesso', noteType: 'automation' } },
      { type: 'create_ai_suggestion', config: { suggestionType: 'upsell', priority: 'medium' } }
    ],
    isActive: false
  },
  {
    name: 'Deteção de Inatividade',
    description: 'Alerta quando cliente está inativo há muito tempo',
    triggerType: 'days_inactive',
    triggerConfig: { days: 30, checkFrequency: 'daily' },
    conditions: [
      { field: 'hasActiveProducts', operator: 'equals', value: true }
    ],
    actions: [
      { type: 'update_churn_risk', config: { newRisk: 'alto' } },
      { type: 'create_task', config: { title: 'Contactar cliente inativo', priority: 'high', assignTo: 'owner', dueDays: 1 } },
      { type: 'create_ai_suggestion', config: { suggestionType: 'churn_warning', priority: 'high' } }
    ],
    isActive: false
  },
  {
    name: 'Cliente Sem Produto Ativo',
    description: 'Deteta clientes que tiveram produtos mas agora não têm nenhum ativo',
    triggerType: 'journey_stage_changed',
    triggerConfig: { fromStage: 'em_consumo', toStage: 'concluido' },
    conditions: [
      { field: 'activeProductsCount', operator: 'equals', value: 0 },
      { field: 'completedProductsCount', operator: 'greater_than', value: 0 }
    ],
    actions: [
      { type: 'update_journey_stage', config: { newStage: 'em_pausa' } },
      { type: 'create_ai_suggestion', config: { suggestionType: 'reactivation', priority: 'medium' } }
    ],
    isActive: false
  }
];
