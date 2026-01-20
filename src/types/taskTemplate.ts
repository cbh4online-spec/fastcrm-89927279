export type TaskPriority = 'high' | 'medium' | 'low';
export type TaskCategory = 
  | 'follow_up' 
  | 'meeting' 
  | 'call' 
  | 'email' 
  | 'proposal' 
  | 'review' 
  | 'administrative' 
  | 'upsell'
  | 'onboarding'
  | 'support'
  | 'other';

export interface TaskTemplate {
  id: string;
  name: string;
  description: string;
  category: TaskCategory;
  priority: TaskPriority;
  defaultDueDays: number;
  suggestedTitle: string;
  contextTriggers: string[];
  aiPrompt?: string;
}

export const TASK_CATEGORY_LABELS: Record<TaskCategory, string> = {
  follow_up: 'Follow-up',
  meeting: 'Reunião',
  call: 'Ligação',
  email: 'Email',
  proposal: 'Proposta',
  review: 'Revisão',
  administrative: 'Administrativo',
  upsell: 'Upsell',
  onboarding: 'Onboarding',
  support: 'Suporte',
  other: 'Outro'
};

export const TASK_CATEGORY_ICONS: Record<TaskCategory, string> = {
  follow_up: 'RefreshCw',
  meeting: 'Calendar',
  call: 'Phone',
  email: 'Mail',
  proposal: 'FileText',
  review: 'CheckSquare',
  administrative: 'Briefcase',
  upsell: 'TrendingUp',
  onboarding: 'UserPlus',
  support: 'HelpCircle',
  other: 'MoreHorizontal'
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  high: 'Alta',
  medium: 'Média',
  low: 'Baixa'
};

export const TASK_PRIORITY_COLORS: Record<TaskPriority, string> = {
  high: 'text-red-600 bg-red-500/10 border-red-500/30',
  medium: 'text-amber-600 bg-amber-500/10 border-amber-500/30',
  low: 'text-green-600 bg-green-500/10 border-green-500/30'
};

// Default task templates
export const DEFAULT_TASK_TEMPLATES: TaskTemplate[] = [
  {
    id: 'follow_up_call',
    name: 'Follow-up Telefónico',
    description: 'Ligação de acompanhamento após contacto inicial',
    category: 'call',
    priority: 'high',
    defaultDueDays: 2,
    suggestedTitle: 'Ligar para {{nome_cliente}}',
    contextTriggers: ['novo_lead', 'sem_resposta'],
    aiPrompt: 'Sugerir pontos de conversa baseados no histórico'
  },
  {
    id: 'send_proposal',
    name: 'Enviar Proposta',
    description: 'Preparar e enviar proposta comercial',
    category: 'proposal',
    priority: 'high',
    defaultDueDays: 3,
    suggestedTitle: 'Enviar proposta para {{nome_cliente}}',
    contextTriggers: ['interesse_confirmado', 'reuniao_feita'],
    aiPrompt: 'Preparar pontos-chave da proposta'
  },
  {
    id: 'schedule_meeting',
    name: 'Agendar Reunião',
    description: 'Marcar reunião de apresentação ou follow-up',
    category: 'meeting',
    priority: 'medium',
    defaultDueDays: 5,
    suggestedTitle: 'Agendar reunião com {{nome_cliente}}',
    contextTriggers: ['proposta_enviada', 'novo_interesse'],
    aiPrompt: 'Sugerir agenda e preparação'
  },
  {
    id: 'onboarding_welcome',
    name: 'Boas-vindas Onboarding',
    description: 'Contacto de boas-vindas para novo cliente',
    category: 'onboarding',
    priority: 'high',
    defaultDueDays: 1,
    suggestedTitle: 'Dar boas-vindas a {{nome_cliente}}',
    contextTriggers: ['novo_cliente', 'primeira_compra'],
    aiPrompt: 'Personalizar mensagem de boas-vindas'
  },
  {
    id: 'upsell_opportunity',
    name: 'Oportunidade Upsell',
    description: 'Propor upgrade ou produto complementar',
    category: 'upsell',
    priority: 'medium',
    defaultDueDays: 7,
    suggestedTitle: 'Propor upgrade para {{nome_cliente}}',
    contextTriggers: ['consumo_alto', 'cliente_satisfeito'],
    aiPrompt: 'Identificar produtos relevantes para upsell'
  },
  {
    id: 'review_account',
    name: 'Revisão de Conta',
    description: 'Analisar situação e performance do cliente',
    category: 'review',
    priority: 'low',
    defaultDueDays: 14,
    suggestedTitle: 'Rever conta de {{nome_cliente}}',
    contextTriggers: ['trimestral', 'anual'],
    aiPrompt: 'Gerar resumo de performance'
  },
  {
    id: 'support_followup',
    name: 'Follow-up Suporte',
    description: 'Verificar resolução de problema/ticket',
    category: 'support',
    priority: 'medium',
    defaultDueDays: 3,
    suggestedTitle: 'Verificar resolução para {{nome_cliente}}',
    contextTriggers: ['ticket_resolvido', 'reclamacao'],
    aiPrompt: 'Preparar pontos de verificação'
  },
  {
    id: 'email_newsletter',
    name: 'Email Personalizado',
    description: 'Enviar comunicação personalizada',
    category: 'email',
    priority: 'low',
    defaultDueDays: 7,
    suggestedTitle: 'Enviar email para {{nome_cliente}}',
    contextTriggers: ['campanha', 'novidade'],
    aiPrompt: 'Sugerir conteúdo relevante'
  }
];

// Helper to apply template variables
export function applyTemplateVariables(
  template: string,
  variables: Record<string, string | number | undefined>
): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(regex, String(value ?? ''));
  }
  return result;
}
