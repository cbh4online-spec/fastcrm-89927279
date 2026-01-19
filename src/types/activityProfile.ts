// Activity Profile System Types

export type ActivityProfileType = 
  | 'formacao_educacao'
  | 'produtos'
  | 'servicos_financeiros'
  | 'marketing_digital'
  | 'avencas_contratos'
  | 'servicos_profissionais'
  | 'generico'
  | 'custom';

export interface ActivityProfile {
  id: string;
  workspace_id: string;
  code: string;
  name: string;
  description: string | null;
  profile_type: ActivityProfileType;
  icon: string;
  color: string;
  is_system: boolean;
  is_active: boolean;
  // Field visibility configuration
  visible_fields: {
    contacts?: string[];
    companies?: string[];
    opportunities?: string[];
  };
  hidden_fields: {
    contacts?: string[];
    companies?: string[];
    opportunities?: string[];
  };
  // Module configuration
  active_modules: string[];
  module_settings: Record<string, unknown>;
  // Custom fields specific to this profile
  custom_fields_config: ProfileCustomField[];
  // Automation triggers
  automation_triggers: ProfileAutomation[];
  // KPI configuration
  kpi_config: ProfileKPI[];
  // AI context and behavior
  ai_context: AIContext;
  ai_suggestions_enabled: boolean;
  // Metadata
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface ProfileCustomField {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'multiselect' | 'boolean' | 'currency';
  entity_types: ('contact' | 'company' | 'opportunity')[];
  options?: string[]; // For select/multiselect
  required?: boolean;
  default_value?: unknown;
}

export interface ProfileAutomation {
  id: string;
  name: string;
  trigger: string;
  conditions: Record<string, unknown>[];
  actions: Record<string, unknown>[];
  enabled: boolean;
}

export interface ProfileKPI {
  id: string;
  name: string;
  label: string;
  metric: string;
  calculation: 'count' | 'sum' | 'avg' | 'percentage';
  entity_type: 'contact' | 'company' | 'opportunity' | 'all';
  field?: string;
  visible: boolean;
}

export interface AIContext {
  terminology: {
    client?: string;
    deal?: string;
    product?: string;
    meeting?: string;
    [key: string]: string | undefined;
  };
  focus_areas: string[];
  suggestions_priority?: string[];
  custom_prompts?: Record<string, string>;
}

export interface EntityProfileData {
  id: string;
  workspace_id: string;
  entity_type: 'contact' | 'company' | 'opportunity';
  entity_id: string;
  activity_profile_id: string;
  field_values: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// Profile-specific field definitions per profile type
export const PROFILE_SPECIFIC_FIELDS: Record<ActivityProfileType, ProfileCustomField[]> = {
  formacao_educacao: [
    { id: 'tipo_aluno', name: 'tipo_aluno', label: 'Tipo de Aluno', type: 'select', entity_types: ['contact'], options: ['Particular', 'Empresarial', 'Bolsa'] },
    { id: 'cursos_inscritos', name: 'cursos_inscritos', label: 'Cursos Inscritos', type: 'multiselect', entity_types: ['contact'], options: [] },
    { id: 'nivel', name: 'nivel', label: 'Nível', type: 'select', entity_types: ['contact'], options: ['1', '2', '3', 'Avançado'] },
    { id: 'sessoes_realizadas', name: 'sessoes_realizadas', label: 'Sessões Realizadas', type: 'number', entity_types: ['contact'] },
    { id: 'sessoes_pendentes', name: 'sessoes_pendentes', label: 'Sessões Pendentes', type: 'number', entity_types: ['contact'] },
    { id: 'certificado', name: 'certificado', label: 'Certificado Emitido', type: 'boolean', entity_types: ['contact'] },
  ],
  produtos: [
    { id: 'produtos_comprados', name: 'produtos_comprados', label: 'Produtos Comprados', type: 'multiselect', entity_types: ['contact', 'company'], options: [] },
    { id: 'frequencia_compra', name: 'frequencia_compra', label: 'Frequência de Compra', type: 'select', entity_types: ['contact', 'company'], options: ['Única', 'Mensal', 'Trimestral', 'Semestral', 'Anual'] },
    { id: 'ultima_compra', name: 'ultima_compra', label: 'Última Compra', type: 'date', entity_types: ['contact', 'company'] },
    { id: 'margem_media', name: 'margem_media', label: 'Margem Média (%)', type: 'number', entity_types: ['contact', 'company'] },
    { id: 'valor_total_compras', name: 'valor_total_compras', label: 'Valor Total de Compras', type: 'currency', entity_types: ['contact', 'company'] },
  ],
  servicos_financeiros: [
    { id: 'tipo_servico', name: 'tipo_servico', label: 'Tipo de Serviço', type: 'select', entity_types: ['contact', 'company'], options: ['Contabilidade', 'Fiscalidade', 'Consultoria', 'Auditoria', 'Outro'] },
    { id: 'datas_fiscais', name: 'datas_fiscais', label: 'Datas Fiscais Importantes', type: 'text', entity_types: ['contact', 'company'] },
    { id: 'documentos_associados', name: 'documentos_associados', label: 'Documentos Associados', type: 'number', entity_types: ['contact', 'company'] },
    { id: 'renovacao_anual', name: 'renovacao_anual', label: 'Renovação Anual', type: 'date', entity_types: ['contact', 'company'] },
    { id: 'regime_fiscal', name: 'regime_fiscal', label: 'Regime Fiscal', type: 'select', entity_types: ['company'], options: ['Simplificado', 'Organizado', 'Isento'] },
  ],
  marketing_digital: [
    { id: 'servicos_contratados', name: 'servicos_contratados', label: 'Serviços Contratados', type: 'multiselect', entity_types: ['contact', 'company'], options: ['SEO', 'Google Ads', 'Meta Ads', 'Social Media', 'Email Marketing', 'Conteúdo'] },
    { id: 'campanhas_ativas', name: 'campanhas_ativas', label: 'Campanhas Ativas', type: 'number', entity_types: ['contact', 'company'] },
    { id: 'budget_marketing', name: 'budget_marketing', label: 'Budget Mensal', type: 'currency', entity_types: ['contact', 'company'] },
    { id: 'kpis_marketing', name: 'kpis_marketing', label: 'KPIs de Marketing', type: 'text', entity_types: ['contact', 'company'] },
    { id: 'relatorios_mensais', name: 'relatorios_mensais', label: 'Relatórios Mensais', type: 'boolean', entity_types: ['contact', 'company'] },
  ],
  avencas_contratos: [
    { id: 'valor_mensal', name: 'valor_mensal', label: 'Valor Mensal', type: 'currency', entity_types: ['contact', 'company'] },
    { id: 'inicio_contrato', name: 'inicio_contrato', label: 'Início do Contrato', type: 'date', entity_types: ['contact', 'company'] },
    { id: 'fim_contrato', name: 'fim_contrato', label: 'Fim do Contrato', type: 'date', entity_types: ['contact', 'company'] },
    { id: 'sla', name: 'sla', label: 'SLA', type: 'select', entity_types: ['contact', 'company'], options: ['Standard', 'Premium', 'Enterprise'] },
    { id: 'renovacao_automatica', name: 'renovacao_automatica', label: 'Renovação Automática', type: 'boolean', entity_types: ['contact', 'company'] },
  ],
  servicos_profissionais: [
    { id: 'tipo_cliente', name: 'tipo_cliente', label: 'Tipo de Cliente', type: 'select', entity_types: ['contact', 'company'], options: ['Pontual', 'Recorrente', 'Projeto', 'Retainer'] },
    { id: 'projetos_ativos', name: 'projetos_ativos', label: 'Projetos Ativos', type: 'number', entity_types: ['contact', 'company'] },
    { id: 'horas_faturadas', name: 'horas_faturadas', label: 'Horas Faturadas', type: 'number', entity_types: ['contact', 'company'] },
    { id: 'valor_hora', name: 'valor_hora', label: 'Valor/Hora', type: 'currency', entity_types: ['contact', 'company'] },
    { id: 'projetos_concluidos', name: 'projetos_concluidos', label: 'Projetos Concluídos', type: 'number', entity_types: ['company'] },
  ],
  generico: [],
  custom: [],
};

// Profile type labels for UI
export const PROFILE_TYPE_LABELS: Record<ActivityProfileType, string> = {
  formacao_educacao: 'Formação / Educação',
  produtos: 'Produtos',
  servicos_financeiros: 'Serviços Financeiros',
  marketing_digital: 'Marketing Digital',
  avencas_contratos: 'Avenças / Contratos',
  servicos_profissionais: 'Serviços Profissionais',
  generico: 'Genérico',
  custom: 'Personalizado',
};

// Profile type icons
export const PROFILE_TYPE_ICONS: Record<ActivityProfileType, string> = {
  formacao_educacao: 'GraduationCap',
  produtos: 'Package',
  servicos_financeiros: 'Calculator',
  marketing_digital: 'TrendingUp',
  avencas_contratos: 'FileText',
  servicos_profissionais: 'Briefcase',
  generico: 'Briefcase',
  custom: 'Settings',
};

// Default modules that are always active
export const BASE_MODULES = [
  'contacts',
  'companies', 
  'opportunities',
  'products',
  'meetings',
  'tasks',
  'history',
  'payments',
] as const;

export type BaseModule = typeof BASE_MODULES[number];
