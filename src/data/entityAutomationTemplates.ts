// Entity-specific automation templates for high productivity

export interface AutomationTemplate {
  id: string;
  name: string;
  description: string;
  entityType: 'lead' | 'contact' | 'company' | 'opportunity' | 'all';
  category: 'follow-up' | 'conversion' | 'nurturing' | 'retention' | 'engagement' | 'sales' | 'onboarding';
  trigger: {
    type: string;
    config: Record<string, unknown>;
  };
  conditions: Array<{
    field_name: string;
    operator: string;
    value: string | null;
  }>;
  actions: Array<{
    action_type: string;
    config: Record<string, unknown>;
  }>;
  estimatedTimeSaved: number; // minutes per week
  successRate: number; // percentage
  popularity: number; // 1-100
  icon: string;
  color: string;
}

// Lead-specific templates
export const LEAD_AUTOMATION_TEMPLATES: AutomationTemplate[] = [
  {
    id: 'lead-inactive-48h',
    name: 'Follow-up Automático 48h',
    description: 'Quando um lead fica inativo por 48 horas, envia uma mensagem de follow-up automaticamente',
    entityType: 'lead',
    category: 'follow-up',
    trigger: { type: 'lead_inactive', config: { hours: 48 } },
    conditions: [{ field_name: 'status', operator: 'not_equals', value: 'completed' }],
    actions: [
      { action_type: 'send_message', config: { channel: 'email', template: 'follow_up_48h' } },
      { action_type: 'create_task', config: { title: 'Verificar resposta de follow-up', due_hours: 24 } }
    ],
    estimatedTimeSaved: 120,
    successRate: 78,
    popularity: 95,
    icon: 'Clock',
    color: 'amber'
  },
  {
    id: 'lead-qualification',
    name: 'Qualificação Inteligente',
    description: 'Analisa automaticamente novos leads e atribui pontuação baseada em comportamento',
    entityType: 'lead',
    category: 'conversion',
    trigger: { type: 'lead_created', config: {} },
    conditions: [],
    actions: [
      { action_type: 'analyze_lead', config: { use_ai: true } },
      { action_type: 'update_field', config: { field: 'lead_score', method: 'calculate' } },
      { action_type: 'notify', config: { condition: 'score > 80', message: 'Lead de alta qualidade!' } }
    ],
    estimatedTimeSaved: 90,
    successRate: 85,
    popularity: 88,
    icon: 'Sparkles',
    color: 'blue'
  },
  {
    id: 'lead-hot-alert',
    name: 'Alerta Lead Quente',
    description: 'Notifica imediatamente quando um lead visualiza a proposta ou visita a página de preços',
    entityType: 'lead',
    category: 'sales',
    trigger: { type: 'lead_activity', config: { action: 'view_proposal' } },
    conditions: [],
    actions: [
      { action_type: 'notify_urgent', config: { channel: 'push', message: 'Lead visualizou proposta!' } },
      { action_type: 'create_task', config: { title: 'Contactar lead imediatamente', priority: 'high' } }
    ],
    estimatedTimeSaved: 60,
    successRate: 92,
    popularity: 82,
    icon: 'Zap',
    color: 'red'
  },
  {
    id: 'lead-source-routing',
    name: 'Routing por Origem',
    description: 'Atribui leads automaticamente a vendedores baseado na origem (Instagram, Website, etc.)',
    entityType: 'lead',
    category: 'sales',
    trigger: { type: 'lead_created', config: {} },
    conditions: [],
    actions: [
      { action_type: 'assign_owner', config: { method: 'by_source' } },
      { action_type: 'send_message', config: { template: 'welcome_by_source' } }
    ],
    estimatedTimeSaved: 45,
    successRate: 88,
    popularity: 75,
    icon: 'GitBranch',
    color: 'violet'
  }
];

// Contact-specific templates
export const CONTACT_AUTOMATION_TEMPLATES: AutomationTemplate[] = [
  {
    id: 'contact-birthday',
    name: 'Felicitação de Aniversário',
    description: 'Envia automaticamente mensagem personalizada no aniversário do contacto',
    entityType: 'contact',
    category: 'engagement',
    trigger: { type: 'contact_birthday', config: {} },
    conditions: [],
    actions: [
      { action_type: 'send_message', config: { channel: 'email', template: 'birthday' } },
      { action_type: 'send_message', config: { channel: 'whatsapp', template: 'birthday_short' } }
    ],
    estimatedTimeSaved: 30,
    successRate: 95,
    popularity: 92,
    icon: 'Gift',
    color: 'pink'
  },
  {
    id: 'contact-reactivation',
    name: 'Reativação 90 Dias',
    description: 'Contacta automaticamente clientes que não compram há 90 dias',
    entityType: 'contact',
    category: 'retention',
    trigger: { type: 'no_purchase', config: { days: 90 } },
    conditions: [{ field_name: 'total_revenue', operator: 'greater_than', value: '0' }],
    actions: [
      { action_type: 'analyze_purchase_history', config: {} },
      { action_type: 'send_message', config: { template: 'reactivation_offer' } },
      { action_type: 'create_task', config: { title: 'Follow-up reativação', due_days: 7 } }
    ],
    estimatedTimeSaved: 180,
    successRate: 45,
    popularity: 88,
    icon: 'RefreshCw',
    color: 'emerald'
  },
  {
    id: 'contact-cross-sell',
    name: 'Cross-Sell Inteligente',
    description: 'Quando compra produto A, sugere automaticamente produto B complementar',
    entityType: 'contact',
    category: 'sales',
    trigger: { type: 'product_purchased', config: {} },
    conditions: [],
    actions: [
      { action_type: 'ai_recommend_products', config: {} },
      { action_type: 'send_message', config: { template: 'cross_sell_recommendation' } }
    ],
    estimatedTimeSaved: 60,
    successRate: 35,
    popularity: 72,
    icon: 'ShoppingBag',
    color: 'blue'
  },
  {
    id: 'contact-journey-advance',
    name: 'Avançar Jornada',
    description: 'Move automaticamente o contacto na jornada baseado em interações',
    entityType: 'contact',
    category: 'nurturing',
    trigger: { type: 'contact_interaction', config: { min_interactions: 3 } },
    conditions: [],
    actions: [
      { action_type: 'update_journey_stage', config: { method: 'advance' } },
      { action_type: 'create_ai_suggestion', config: { type: 'next_best_action' } }
    ],
    estimatedTimeSaved: 45,
    successRate: 80,
    popularity: 68,
    icon: 'TrendingUp',
    color: 'violet'
  }
];

// Company-specific templates
export const COMPANY_AUTOMATION_TEMPLATES: AutomationTemplate[] = [
  {
    id: 'company-renewal-alert',
    name: 'Alerta de Renovação',
    description: 'Alerta 30 dias antes do contrato expirar para iniciar processo de renovação',
    entityType: 'company',
    category: 'retention',
    trigger: { type: 'contract_expiring', config: { days_before: 30 } },
    conditions: [],
    actions: [
      { action_type: 'create_opportunity', config: { type: 'renewal' } },
      { action_type: 'create_task', config: { title: 'Preparar proposta de renovação', priority: 'high' } },
      { action_type: 'notify', config: { message: 'Contrato da {{company.name}} expira em 30 dias' } }
    ],
    estimatedTimeSaved: 120,
    successRate: 88,
    popularity: 95,
    icon: 'Calendar',
    color: 'amber'
  },
  {
    id: 'company-onboarding',
    name: 'Onboarding Automático',
    description: 'Quando novo colaborador é adicionado à empresa, inicia sequência de onboarding',
    entityType: 'company',
    category: 'onboarding',
    trigger: { type: 'contact_added_to_company', config: {} },
    conditions: [],
    actions: [
      { action_type: 'send_message', config: { template: 'welcome_new_contact' } },
      { action_type: 'create_task', config: { title: 'Agendar call de introdução' } },
      { action_type: 'add_to_sequence', config: { sequence: 'new_stakeholder' } }
    ],
    estimatedTimeSaved: 90,
    successRate: 85,
    popularity: 78,
    icon: 'UserPlus',
    color: 'emerald'
  },
  {
    id: 'company-upsell',
    name: 'Upsell por Crescimento',
    description: 'Quando faturação ultrapassa threshold, propõe automaticamente upgrade',
    entityType: 'company',
    category: 'sales',
    trigger: { type: 'revenue_threshold', config: { threshold: 'plan_limit' } },
    conditions: [],
    actions: [
      { action_type: 'create_opportunity', config: { type: 'upsell' } },
      { action_type: 'ai_generate_proposal', config: { type: 'upgrade' } },
      { action_type: 'notify', config: { message: 'Oportunidade de upsell em {{company.name}}' } }
    ],
    estimatedTimeSaved: 60,
    successRate: 42,
    popularity: 82,
    icon: 'TrendingUp',
    color: 'blue'
  },
  {
    id: 'company-health-score',
    name: 'Score de Saúde',
    description: 'Monitoriza sinais de churn e alerta quando empresa está em risco',
    entityType: 'company',
    category: 'retention',
    trigger: { type: 'health_score_drop', config: { threshold: 50 } },
    conditions: [],
    actions: [
      { action_type: 'notify_urgent', config: { message: 'ALERTA: {{company.name}} em risco de churn!' } },
      { action_type: 'create_task', config: { title: 'Contactar para entender situação', priority: 'high' } },
      { action_type: 'add_tag', config: { tag: 'at-risk' } }
    ],
    estimatedTimeSaved: 150,
    successRate: 65,
    popularity: 88,
    icon: 'Heart',
    color: 'red'
  }
];

// Opportunity-specific templates
export const OPPORTUNITY_AUTOMATION_TEMPLATES: AutomationTemplate[] = [
  {
    id: 'opportunity-stage-tasks',
    name: 'Tarefas por Estágio',
    description: 'Cria automaticamente tarefas específicas quando oportunidade muda de estágio',
    entityType: 'opportunity',
    category: 'sales',
    trigger: { type: 'opportunity_stage_changed', config: {} },
    conditions: [],
    actions: [
      { action_type: 'create_stage_tasks', config: { method: 'by_stage' } },
      { action_type: 'notify', config: { message: 'Oportunidade avançou para {{opportunity.stage}}' } }
    ],
    estimatedTimeSaved: 60,
    successRate: 90,
    popularity: 92,
    icon: 'CheckSquare',
    color: 'blue'
  },
  {
    id: 'opportunity-stale-alert',
    name: 'Alerta de Estagnação',
    description: 'Alerta quando oportunidade está no mesmo estágio há mais de X dias',
    entityType: 'opportunity',
    category: 'sales',
    trigger: { type: 'opportunity_stale', config: { days: 14 } },
    conditions: [{ field_name: 'stage', operator: 'not_equals', value: 'won' }],
    actions: [
      { action_type: 'notify', config: { message: 'Oportunidade {{opportunity.name}} parada há 14 dias' } },
      { action_type: 'create_ai_suggestion', config: { type: 'next_best_action' } }
    ],
    estimatedTimeSaved: 30,
    successRate: 75,
    popularity: 85,
    icon: 'AlertTriangle',
    color: 'amber'
  },
  {
    id: 'opportunity-high-value',
    name: 'Gestão de Alto Valor',
    description: 'Tratamento especial para oportunidades acima de determinado valor',
    entityType: 'opportunity',
    category: 'sales',
    trigger: { type: 'opportunity_created', config: {} },
    conditions: [{ field_name: 'value', operator: 'greater_than', value: '10000' }],
    actions: [
      { action_type: 'assign_owner', config: { method: 'senior_sales' } },
      { action_type: 'notify', config: { to: 'manager', message: 'Nova oportunidade de alto valor!' } },
      { action_type: 'add_tag', config: { tag: 'high-value' } }
    ],
    estimatedTimeSaved: 30,
    successRate: 85,
    popularity: 78,
    icon: 'Diamond',
    color: 'violet'
  }
];

// All templates combined
export const ALL_AUTOMATION_TEMPLATES: AutomationTemplate[] = [
  ...LEAD_AUTOMATION_TEMPLATES,
  ...CONTACT_AUTOMATION_TEMPLATES,
  ...COMPANY_AUTOMATION_TEMPLATES,
  ...OPPORTUNITY_AUTOMATION_TEMPLATES
];

// Get templates by entity type
export function getTemplatesByEntityType(entityType: 'lead' | 'contact' | 'company' | 'opportunity'): AutomationTemplate[] {
  return ALL_AUTOMATION_TEMPLATES.filter(t => t.entityType === entityType || t.entityType === 'all');
}

// Get templates by category
export function getTemplatesByCategory(category: AutomationTemplate['category']): AutomationTemplate[] {
  return ALL_AUTOMATION_TEMPLATES.filter(t => t.category === category);
}

// Get top templates (most popular)
export function getTopTemplates(limit: number = 5): AutomationTemplate[] {
  return [...ALL_AUTOMATION_TEMPLATES]
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, limit);
}

// Calculate total time saved from active templates
export function calculateTotalTimeSaved(templateIds: string[]): number {
  return templateIds.reduce((total, id) => {
    const template = ALL_AUTOMATION_TEMPLATES.find(t => t.id === id);
    return total + (template?.estimatedTimeSaved || 0);
  }, 0);
}

// Template categories with labels
export const TEMPLATE_CATEGORIES = {
  'follow-up': { label: 'Follow-up', icon: 'Clock', color: 'amber' },
  'conversion': { label: 'Conversão', icon: 'Target', color: 'emerald' },
  'nurturing': { label: 'Nutrição', icon: 'Sparkles', color: 'blue' },
  'retention': { label: 'Retenção', icon: 'Shield', color: 'violet' },
  'engagement': { label: 'Engagement', icon: 'Heart', color: 'pink' },
  'sales': { label: 'Vendas', icon: 'TrendingUp', color: 'green' },
  'onboarding': { label: 'Onboarding', icon: 'UserPlus', color: 'cyan' }
} as const;
