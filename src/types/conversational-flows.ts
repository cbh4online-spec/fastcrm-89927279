// Conversational Flows Types for Visual Flow Builder

export type FlowStatus = 'draft' | 'active' | 'paused' | 'archived';
export type SessionStatus = 'active' | 'completed' | 'abandoned' | 'handed_off';
export type FlowStepType = 
  | 'message' | 'question' | 'condition' | 'action' | 'goal' | 'handoff'
  | 'ai_analyze' | 'ai_research' | 'ai_predict' | 'ai_generate_message' | 'ai_summarize' | 'ai_extract_tasks';

export type FlowConditionOperator = 
  | 'equals' 
  | 'not_equals' 
  | 'contains' 
  | 'not_contains'
  | 'greater_than' 
  | 'less_than' 
  | 'is_empty' 
  | 'is_not_empty' 
  | 'matches_intent';

export type VariableType = 'text' | 'email' | 'phone' | 'number' | 'date' | 'boolean' | 'choice';
export type ActionType = 'add_tag' | 'assign_user' | 'create_task' | 'send_notification' | 'update_field' | 'webhook';
export type GoalType = 'lead_capture' | 'qualification' | 'booking' | 'support' | 'custom';
export type FallbackBehavior = 'handoff' | 'retry' | 'escalate';

export type AIInputSource = 'current_lead' | 'current_company' | 'current_deal' | 'conversation_history' | 'custom';

// Database models
export interface ConversationalFlow {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  status: FlowStatus;
  goalType?: GoalType | string;
  goalDescription?: string;
  successMessage?: string;
  triggerKeywords?: string[];
  triggerChannels?: string[];
  triggerConditions?: Record<string, unknown>;
  personaId?: string;
  knowledgeBaseIds?: string[];
  fallbackBehavior: FallbackBehavior;
  maxRetries: number;
  isDefault: boolean;
  priority: number;
  timeoutMinutes: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface FlowVariable {
  id: string;
  flowId: string;
  name: string;
  displayName: string;
  variableType: VariableType;
  isRequired: boolean;
  validationPattern?: string;
  validationMessage?: string;
  choices?: string[];
  mapToField?: string;
  defaultValue?: string;
  position: number;
  createdAt: string;
}

export interface FlowStep {
  id: string;
  flowId: string;
  stepType: FlowStepType;
  name: string;
  messageContent?: string;
  messageVariants?: string[];
  variableId?: string;
  quickReplies?: string[];
  conditionField?: string;
  conditionOperator?: FlowConditionOperator;
  conditionValue?: string;
  actionType?: ActionType;
  actionConfig?: Record<string, unknown>;
  goalName?: string;
  conversionValue?: number;
  nextStepId?: string;
  conditionTrueStepId?: string;
  conditionFalseStepId?: string;
  positionX: number;
  positionY: number;
  isEntryPoint: boolean;
  position: number;
  // AI fields
  aiModel?: string;
  aiPrompt?: string;
  aiInputSource?: string;
  aiOutputVariable?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationSession {
  id: string;
  workspaceId: string;
  flowId?: string;
  conversationId?: string;
  leadId?: string;
  contactId?: string;
  channel: string;
  currentStepId?: string;
  status: SessionStatus;
  variables: Record<string, unknown>;
  startedAt: string;
  completedAt?: string;
  goalAchieved: boolean;
  goalAchievedAt?: string;
  stepHistory: Array<{ stepId: string; timestamp: string; response?: string }>;
  handedOffTo?: string;
  handedOffAt?: string;
  abandonmentReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FlowAnalytics {
  id: string;
  workspaceId: string;
  flowId: string;
  date: string;
  sessionsStarted: number;
  sessionsCompleted: number;
  sessionsAbandoned: number;
  sessionsHandedOff: number;
  goalsAchieved: number;
  totalConversionValue: number;
  avgDurationSeconds?: number;
  avgStepsCompleted?: number;
  stepMetrics?: Record<string, { views: number; completions: number; dropOffs: number }>;
  createdAt: string;
}

// React Flow Node types
export interface FlowNodeData {
  step: FlowStep;
  onEdit: (step: FlowStep) => void;
  onDelete: (stepId: string) => void;
  variables: FlowVariable[];
}

// Helper to check if a step type is AI
export function isAIStepType(type: FlowStepType): boolean {
  return type.startsWith('ai_');
}

// Step type configurations
export const STEP_TYPE_CONFIG: Record<FlowStepType, {
  label: string;
  icon: string;
  color: string;
  bgColor: string;
  description: string;
  category?: 'standard' | 'ai';
}> = {
  message: {
    label: 'Mensagem',
    icon: 'MessageSquare',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 dark:bg-blue-900/40',
    description: 'Envia uma mensagem ao utilizador',
    category: 'standard'
  },
  question: {
    label: 'Pergunta',
    icon: 'HelpCircle',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100 dark:bg-purple-900/40',
    description: 'Faz uma pergunta e aguarda resposta',
    category: 'standard'
  },
  condition: {
    label: 'Condição',
    icon: 'GitBranch',
    color: 'text-amber-600',
    bgColor: 'bg-amber-100 dark:bg-amber-900/40',
    description: 'Ramifica baseado em condição',
    category: 'standard'
  },
  action: {
    label: 'Ação',
    icon: 'Zap',
    color: 'text-green-600',
    bgColor: 'bg-green-100 dark:bg-green-900/40',
    description: 'Executa uma ação (tag, tarefa, etc.)',
    category: 'standard'
  },
  goal: {
    label: 'Objetivo',
    icon: 'Target',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/40',
    description: 'Marca objetivo alcançado',
    category: 'standard'
  },
  handoff: {
    label: 'Handoff',
    icon: 'UserCheck',
    color: 'text-red-600',
    bgColor: 'bg-red-100 dark:bg-red-900/40',
    description: 'Transfere para agente humano',
    category: 'standard'
  },
  ai_analyze: {
    label: 'AI Análise',
    icon: 'Brain',
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-100 dark:bg-cyan-900/40',
    description: 'Analisa um registo com IA',
    category: 'ai'
  },
  ai_research: {
    label: 'AI Pesquisa',
    icon: 'Search',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100 dark:bg-indigo-900/40',
    description: 'Pesquisa empresa via web/enrichment',
    category: 'ai'
  },
  ai_predict: {
    label: 'AI Previsão',
    icon: 'TrendingUp',
    color: 'text-cyan-700',
    bgColor: 'bg-cyan-100 dark:bg-cyan-900/40',
    description: 'Prevê resultado de deal / score',
    category: 'ai'
  },
  ai_generate_message: {
    label: 'AI Mensagem',
    icon: 'PenTool',
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-100 dark:bg-indigo-900/40',
    description: 'Gera mensagem personalizada com IA',
    category: 'ai'
  },
  ai_summarize: {
    label: 'AI Resumo',
    icon: 'FileText',
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-100 dark:bg-cyan-900/40',
    description: 'Resume conversa/chamada com IA',
    category: 'ai'
  },
  ai_extract_tasks: {
    label: 'AI Tarefas',
    icon: 'ListChecks',
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-100 dark:bg-indigo-900/40',
    description: 'Extrai action items de texto',
    category: 'ai'
  }
};

export const AI_MODEL_OPTIONS = [
  { value: 'google/gemini-3-flash-preview', label: 'Gemini 3 Flash (Rápido)' },
  { value: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
  { value: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro (Avançado)' },
  { value: 'openai/gpt-5-mini', label: 'GPT-5 Mini' },
  { value: 'openai/gpt-5', label: 'GPT-5 (Premium)' },
];

export const AI_INPUT_SOURCE_OPTIONS = [
  { value: 'current_lead', label: 'Lead Atual' },
  { value: 'current_company', label: 'Empresa Atual' },
  { value: 'current_deal', label: 'Deal Atual' },
  { value: 'conversation_history', label: 'Histórico da Conversa' },
  { value: 'custom', label: 'Personalizado' },
];

export const VARIABLE_TYPE_CONFIG: Record<VariableType, {
  label: string;
  icon: string;
  placeholder: string;
}> = {
  text: { label: 'Texto', icon: 'Type', placeholder: 'Ex: João Silva' },
  email: { label: 'Email', icon: 'Mail', placeholder: 'Ex: joao@email.com' },
  phone: { label: 'Telefone', icon: 'Phone', placeholder: 'Ex: +351 912 345 678' },
  number: { label: 'Número', icon: 'Hash', placeholder: 'Ex: 25' },
  date: { label: 'Data', icon: 'Calendar', placeholder: 'Ex: 2024-01-15' },
  boolean: { label: 'Sim/Não', icon: 'ToggleLeft', placeholder: 'Sim ou Não' },
  choice: { label: 'Escolha', icon: 'List', placeholder: 'Selecione uma opção' }
};

export const ACTION_TYPE_CONFIG: Record<ActionType, {
  label: string;
  icon: string;
  description: string;
}> = {
  add_tag: { label: 'Adicionar Tag', icon: 'Tag', description: 'Adiciona uma tag ao lead/contacto' },
  assign_user: { label: 'Atribuir Utilizador', icon: 'UserPlus', description: 'Atribui a um membro da equipa' },
  create_task: { label: 'Criar Tarefa', icon: 'CheckSquare', description: 'Cria uma tarefa de seguimento' },
  send_notification: { label: 'Notificação', icon: 'Bell', description: 'Envia notificação à equipa' },
  update_field: { label: 'Atualizar Campo', icon: 'Edit3', description: 'Atualiza um campo do lead' },
  webhook: { label: 'Webhook', icon: 'Globe', description: 'Chama um webhook externo' }
};

export const GOAL_TYPE_CONFIG: Record<GoalType, {
  label: string;
  icon: string;
  description: string;
}> = {
  lead_capture: { label: 'Captura de Lead', icon: 'UserPlus', description: 'Recolher dados de contacto' },
  qualification: { label: 'Qualificação', icon: 'Filter', description: 'Qualificar interesse/fit' },
  booking: { label: 'Agendamento', icon: 'Calendar', description: 'Agendar reunião/chamada' },
  support: { label: 'Suporte', icon: 'LifeBuoy', description: 'Resolver questão de suporte' },
  custom: { label: 'Personalizado', icon: 'Star', description: 'Objetivo personalizado' }
};

export const CONDITION_OPERATOR_CONFIG: Record<FlowConditionOperator, {
  label: string;
  requiresValue: boolean;
}> = {
  equals: { label: 'É igual a', requiresValue: true },
  not_equals: { label: 'É diferente de', requiresValue: true },
  contains: { label: 'Contém', requiresValue: true },
  not_contains: { label: 'Não contém', requiresValue: true },
  greater_than: { label: 'Maior que', requiresValue: true },
  less_than: { label: 'Menor que', requiresValue: true },
  is_empty: { label: 'Está vazio', requiresValue: false },
  is_not_empty: { label: 'Não está vazio', requiresValue: false },
  matches_intent: { label: 'Corresponde à intenção', requiresValue: true }
};

// Helper to convert DB snake_case to camelCase
export function mapFlowFromDB(row: Record<string, unknown>): ConversationalFlow {
  return {
    id: row.id as string,
    workspaceId: row.workspace_id as string,
    name: row.name as string,
    description: row.description as string | undefined,
    status: row.status as FlowStatus,
    goalType: row.goal_type as string | undefined,
    goalDescription: row.goal_description as string | undefined,
    successMessage: row.success_message as string | undefined,
    triggerKeywords: row.trigger_keywords as string[] | undefined,
    triggerChannels: row.trigger_channels as string[] | undefined,
    triggerConditions: row.trigger_conditions as Record<string, unknown> | undefined,
    personaId: row.persona_id as string | undefined,
    knowledgeBaseIds: row.knowledge_base_ids as string[] | undefined,
    fallbackBehavior: (row.fallback_behavior || 'handoff') as FallbackBehavior,
    maxRetries: (row.max_retries || 2) as number,
    isDefault: (row.is_default || false) as boolean,
    priority: (row.priority || 0) as number,
    timeoutMinutes: (row.timeout_minutes || 30) as number,
    createdBy: row.created_by as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string
  };
}

export function mapStepFromDB(row: Record<string, unknown>): FlowStep {
  return {
    id: row.id as string,
    flowId: row.flow_id as string,
    stepType: row.step_type as FlowStepType,
    name: row.name as string,
    messageContent: row.message_content as string | undefined,
    messageVariants: row.message_variants as string[] | undefined,
    variableId: row.variable_id as string | undefined,
    quickReplies: row.quick_replies as string[] | undefined,
    conditionField: row.condition_field as string | undefined,
    conditionOperator: row.condition_operator as FlowConditionOperator | undefined,
    conditionValue: row.condition_value as string | undefined,
    actionType: row.action_type as ActionType | undefined,
    actionConfig: row.action_config as Record<string, unknown> | undefined,
    goalName: row.goal_name as string | undefined,
    conversionValue: row.conversion_value as number | undefined,
    nextStepId: row.next_step_id as string | undefined,
    conditionTrueStepId: row.condition_true_step_id as string | undefined,
    conditionFalseStepId: row.condition_false_step_id as string | undefined,
    positionX: (row.position_x || 0) as number,
    positionY: (row.position_y || 0) as number,
    isEntryPoint: (row.is_entry_point || false) as boolean,
    position: (row.position || 0) as number,
    aiModel: row.ai_model as string | undefined,
    aiPrompt: row.ai_prompt as string | undefined,
    aiInputSource: row.ai_input_source as string | undefined,
    aiOutputVariable: row.ai_output_variable as string | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string
  };
}

export function mapVariableFromDB(row: Record<string, unknown>): FlowVariable {
  return {
    id: row.id as string,
    flowId: row.flow_id as string,
    name: row.name as string,
    displayName: row.display_name as string,
    variableType: row.variable_type as VariableType,
    isRequired: (row.is_required || false) as boolean,
    validationPattern: row.validation_pattern as string | undefined,
    validationMessage: row.validation_message as string | undefined,
    choices: row.choices as string[] | undefined,
    mapToField: row.map_to_field as string | undefined,
    defaultValue: row.default_value as string | undefined,
    position: (row.position || 0) as number,
    createdAt: row.created_at as string
  };
}
