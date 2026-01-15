export type FormType = 
  | 'lead_capture' 
  | 'qualification' 
  | 'proposal_request' 
  | 'support' 
  | 'onboarding' 
  | 'reactivation'
  | 'internal';

export interface ScoringRule {
  id: string;
  fieldId: string;
  condition: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'is_corporate_email';
  value?: string | number;
  scoreChange: number;
  temperatureEffect?: 'increase' | 'decrease' | 'none';
}

export interface ConditionalRule {
  id: string;
  sourceFieldId: string;
  condition: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
  value: string | number;
  action: 'show' | 'hide' | 'require';
  targetFieldId: string;
}

export interface AutomationConfig {
  createLead: boolean;
  createContact: boolean;
  createCompany: boolean;
  createOpportunity: boolean;
  assignTo?: string;
  triggerAutomations: string[];
  sendEmail: boolean;
  emailTemplateId?: string;
  notifyUsers: string[];
}

export interface FormSettings {
  submitButtonText: string;
  successMessage: string;
  redirectUrl?: string;
  showProgressBar: boolean;
  allowMultipleSubmissions: boolean;
  requireAuth: boolean;
  theme: 'light' | 'dark' | 'auto';
}

export interface SmartFormField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'currency' | 'date' | 'datetime' | 'boolean' | 'select' | 'multiselect' | 'email' | 'phone' | 'url' | 'file';
  required: boolean;
  placeholder?: string;
  helpText?: string;
  options?: { label: string; value: string }[];
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
  };
  enrichmentSource?: 'email' | 'website' | 'ip';
  conversationalPrompt?: string;
}

export interface SmartFormSchema {
  fields: SmartFormField[];
  scoringRules: ScoringRule[];
  conditions: ConditionalRule[];
  automationConfig: AutomationConfig;
  settings: FormSettings;
}

export interface SmartForm {
  id: string;
  workspace_id: string;
  created_by: string;
  name: string;
  description?: string;
  form_type: FormType;
  schema: SmartFormSchema;
  scoring_rules: ScoringRule[];
  conditions: ConditionalRule[];
  automation_config: AutomationConfig;
  settings: FormSettings;
  is_conversational: boolean;
  is_active: boolean;
  is_internal: boolean;
  slug?: string;
  submission_count: number;
  conversion_rate: number;
  created_at: string;
  updated_at: string;
}

export interface FormSubmission {
  id: string;
  form_id: string;
  workspace_id: string;
  raw_data: Record<string, unknown>;
  enriched_data: EnrichedData;
  score: number;
  temperature: 'cold' | 'warm' | 'hot';
  ai_summary?: string;
  ai_next_action?: string;
  lead_id?: string;
  contact_id?: string;
  company_id?: string;
  opportunity_id?: string;
  ip_address?: string;
  user_agent?: string;
  location_data: LocationData;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
}

export interface EnrichedData {
  company?: {
    name?: string;
    domain?: string;
    industry?: string;
    size?: string;
    description?: string;
  };
  contact?: {
    type: 'corporate' | 'generic' | 'personal';
    country?: string;
    language?: string;
  };
  website?: {
    sector?: string;
    services?: string[];
    description?: string;
  };
}

export interface LocationData {
  country?: string;
  city?: string;
  timezone?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export const FORM_TEMPLATES: Record<FormType, {
  name: string;
  description: string;
  icon: string;
  suggestedFields: Partial<SmartFormField>[];
  baseScore: number;
  suggestedAutomations: string[];
}> = {
  lead_capture: {
    name: 'Captação de Lead',
    description: 'Formulário simples para captar novos contactos',
    icon: 'UserPlus',
    suggestedFields: [
      { id: 'name', label: 'Nome', type: 'text', required: true },
      { id: 'email', label: 'Email', type: 'email', required: true, enrichmentSource: 'email' },
      { id: 'phone', label: 'Telefone', type: 'phone', required: false },
      { id: 'company', label: 'Empresa', type: 'text', required: false },
    ],
    baseScore: 20,
    suggestedAutomations: ['create_lead', 'send_welcome_email'],
  },
  qualification: {
    name: 'Qualificação',
    description: 'Qualificar leads com perguntas estratégicas',
    icon: 'Target',
    suggestedFields: [
      { id: 'name', label: 'Nome', type: 'text', required: true },
      { id: 'email', label: 'Email', type: 'email', required: true, enrichmentSource: 'email' },
      { id: 'company', label: 'Empresa', type: 'text', required: true },
      { id: 'website', label: 'Website', type: 'url', required: false, enrichmentSource: 'website' },
      { id: 'budget', label: 'Orçamento', type: 'select', required: true, options: [
        { label: 'Até €1.000', value: 'low' },
        { label: '€1.000 - €5.000', value: 'medium' },
        { label: '€5.000 - €10.000', value: 'high' },
        { label: 'Mais de €10.000', value: 'enterprise' },
      ]},
      { id: 'urgency', label: 'Urgência', type: 'select', required: true, options: [
        { label: 'Imediata', value: 'immediate' },
        { label: 'Este mês', value: 'this_month' },
        { label: 'Este trimestre', value: 'this_quarter' },
        { label: 'Apenas a explorar', value: 'exploring' },
      ]},
    ],
    baseScore: 30,
    suggestedAutomations: ['create_lead', 'qualify_lead', 'assign_sales'],
  },
  proposal_request: {
    name: 'Pedido de Proposta',
    description: 'Recolher informação para criar proposta',
    icon: 'FileText',
    suggestedFields: [
      { id: 'name', label: 'Nome', type: 'text', required: true },
      { id: 'email', label: 'Email', type: 'email', required: true, enrichmentSource: 'email' },
      { id: 'company', label: 'Empresa', type: 'text', required: true },
      { id: 'phone', label: 'Telefone', type: 'phone', required: true },
      { id: 'service', label: 'Serviço Pretendido', type: 'select', required: true },
      { id: 'budget', label: 'Orçamento Disponível', type: 'currency', required: true },
      { id: 'deadline', label: 'Prazo Pretendido', type: 'date', required: false },
      { id: 'details', label: 'Detalhes do Projeto', type: 'textarea', required: true },
    ],
    baseScore: 50,
    suggestedAutomations: ['create_lead', 'create_opportunity', 'notify_sales', 'send_confirmation'],
  },
  support: {
    name: 'Suporte',
    description: 'Formulário para pedidos de suporte',
    icon: 'HelpCircle',
    suggestedFields: [
      { id: 'name', label: 'Nome', type: 'text', required: true },
      { id: 'email', label: 'Email', type: 'email', required: true },
      { id: 'subject', label: 'Assunto', type: 'text', required: true },
      { id: 'priority', label: 'Prioridade', type: 'select', required: true, options: [
        { label: 'Baixa', value: 'low' },
        { label: 'Média', value: 'medium' },
        { label: 'Alta', value: 'high' },
        { label: 'Urgente', value: 'urgent' },
      ]},
      { id: 'message', label: 'Mensagem', type: 'textarea', required: true },
    ],
    baseScore: 10,
    suggestedAutomations: ['create_ticket', 'notify_support', 'send_confirmation'],
  },
  onboarding: {
    name: 'Onboarding',
    description: 'Formulário para novos clientes',
    icon: 'Rocket',
    suggestedFields: [
      { id: 'name', label: 'Nome', type: 'text', required: true },
      { id: 'email', label: 'Email', type: 'email', required: true },
      { id: 'company', label: 'Empresa', type: 'text', required: true },
      { id: 'role', label: 'Cargo', type: 'text', required: true },
      { id: 'goals', label: 'Objetivos Principais', type: 'multiselect', required: true },
      { id: 'start_date', label: 'Data de Início', type: 'date', required: true },
    ],
    baseScore: 40,
    suggestedAutomations: ['create_contact', 'send_welcome', 'assign_account_manager'],
  },
  reactivation: {
    name: 'Reativação',
    description: 'Reconquistar leads inativos',
    icon: 'RefreshCw',
    suggestedFields: [
      { id: 'email', label: 'Email', type: 'email', required: true },
      { id: 'reason', label: 'O que te traz de volta?', type: 'select', required: true, options: [
        { label: 'Novo projeto', value: 'new_project' },
        { label: 'Mudança de necessidades', value: 'needs_changed' },
        { label: 'Comparação de preços', value: 'price_comparison' },
        { label: 'Recomendação', value: 'recommendation' },
      ]},
      { id: 'interest', label: 'Área de Interesse', type: 'text', required: true },
    ],
    baseScore: 35,
    suggestedAutomations: ['update_lead_status', 'notify_sales', 'send_reactivation_offer'],
  },
  internal: {
    name: 'Interno',
    description: 'Formulário para uso interno da equipa',
    icon: 'Building',
    suggestedFields: [],
    baseScore: 0,
    suggestedAutomations: [],
  },
};
